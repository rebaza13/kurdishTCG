import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyUser } from "@/lib/supabase/verify-user";
import { cancelFibPayment, createFibPayment, FibPayError } from "@/lib/fib";
import { locales, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const RETRYABLE = new Set(["pending", "declined"]);

/**
 * The FIB API has no "reissue the QR" endpoint — a payment's QR/app-links
 * only ever come back from create. So "retry" here means: cancel the stale
 * payment (best-effort — it may already be expired or declined at FIB) and
 * create a brand new one for the same order, priced from the order's own
 * stored total (not re-priced from `products`, since that's already the
 * server-validated snapshot from when the order was placed).
 */
export async function POST(request: Request) {
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
    .select("id, user_id, payment_method, payment_status, total, fib_payment_id")
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

  if (order.fib_payment_id) {
    await cancelFibPayment(order.fib_payment_id).catch(() => {});
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
    const message = err instanceof FibPayError ? err.message : "FIB payment creation failed";
    return NextResponse.json({ error: "fib_error", message }, { status: 502 });
  }

  const { error: updateError } = await admin
    .from("orders")
    .update({
      payment_status: "pending",
      fib_payment_id: payment.paymentId,
      fib_readable_code: payment.readableCode,
      fib_valid_until: payment.validUntil,
      fib_declining_reason: null,
      fib_declined_at: null,
    })
    .eq("id", order.id);
  if (updateError) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
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
