import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyUser } from "@/lib/supabase/verify-user";
import { cancelFibPayment, createFibPayment, FibPayError } from "@/lib/fib";
import { rateLimit } from "@/lib/rate-limit";
import { locales, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const RETRYABLE = new Set(["pending", "declined"]);

/**
 * A FIB decline auto-cancels a still-"requested" order (see lib/fib-sync).
 * Paying again is only offered when that cancel came from FIB itself (code
 * expired / FIB-side failure) — then the order is revived to "requested".
 * An order the shop cancelled (admin cancel: no FIB declining reason, or an
 * explicit PAYMENT_CANCELLATION) must not become payable again; before this
 * check a customer could pay for a cancelled order and it would stay
 * "cancelled" forever, since fib-sync only advances from "requested".
 */
const REVIVABLE_DECLINE_REASONS = new Set(["PAYMENT_EXPIRATION", "SERVER_FAILURE"]);

/**
 * The FIB API has no "reissue the QR" endpoint — a payment's QR/app-links
 * only ever come back from create. So "retry" here means: cancel the stale
 * payment (best-effort — it may already be expired or declined at FIB) and
 * create a brand new one for the same order, priced from the order's own
 * stored total (not re-priced from `products`, since that's already the
 * server-validated snapshot from when the order was placed).
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "fib-retry", 10, 60_000);
  if (limited) return limited;

  const user = await verifyUser(request);
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  let body: { orderId?: string; locale?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.orderId) {
    return NextResponse.json({ error: "missing_order_id" }, { status: 400 });
  }
  const locale: Locale = locales.includes(body.locale as Locale) ? (body.locale as Locale) : "en";

  const admin = getSupabaseAdmin();
  const { data: order, error } = await admin
    .from("orders")
    .select("id, user_id, status, payment_method, payment_status, total, fib_payment_id, fib_declining_reason")
    .eq("id", body.orderId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!order || order.user_id !== user.id || order.payment_method !== "fib") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!RETRYABLE.has(order.payment_status ?? "")) {
    return NextResponse.json({ error: "not_retryable" }, { status: 409 });
  }
  const revive =
    order.status === "cancelled" &&
    REVIVABLE_DECLINE_REASONS.has(order.fib_declining_reason ?? "");
  if (order.status !== "requested" && !revive) {
    return NextResponse.json({ error: "not_retryable" }, { status: 409 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  let payment;
  try {
    payment = await createFibPayment({
      amount: Math.round(Number(order.total)),
      description: `KurdishTCG order #${order.id.slice(0, 8).toUpperCase()}`,
      callbackUrl: `${siteUrl}/api/fib/webhook`,
      redirectUrl: `${siteUrl}/${locale}/account/orders/${order.id}`,
    });
  } catch (err) {
    console.error("[fib/retry] create failed:", err instanceof FibPayError ? err.message : err);
    return NextResponse.json({ error: "fib_error" }, { status: 502 });
  }

  // Compare-and-swap on the payment we saw: of two concurrent retries only
  // one still matches, the other's fresh payment is cancelled below instead
  // of being left live-but-unlinked at FIB.
  const swap = admin
    .from("orders")
    .update({
      payment_status: "pending",
      fib_payment_id: payment.paymentId,
      fib_readable_code: payment.readableCode,
      fib_valid_until: payment.validUntil,
      fib_declining_reason: null,
      fib_declined_at: null,
      ...(revive ? { status: "requested" } : {}),
    })
    .eq("id", order.id);
  const { data: swapped, error: updateError } = await (order.fib_payment_id
    ? swap.eq("fib_payment_id", order.fib_payment_id)
    : swap.is("fib_payment_id", null)
  ).select("id");
  if (updateError || !swapped?.length) {
    await cancelFibPayment(payment.paymentId).catch(() => {});
    return updateError
      ? NextResponse.json({ error: "server_error" }, { status: 500 })
      : NextResponse.json({ error: "retry_in_progress" }, { status: 409 });
  }

  // Now that the order points at the new payment, retire the stale one.
  if (order.fib_payment_id) {
    await cancelFibPayment(order.fib_payment_id).catch(() => {});
  }

  return NextResponse.json({
    orderId: order.id,
    payment: {
      paymentId: payment.paymentId,
      readableCode: payment.readableCode,
      qrCode: payment.qrCode,
      validUntil: payment.validUntil,
      personalAppLink: payment.personalAppLink,
      businessAppLink: payment.businessAppLink,
      corporateAppLink: payment.corporateAppLink,
    },
  });
}
