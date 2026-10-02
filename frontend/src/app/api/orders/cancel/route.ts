import { after, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyUser } from "@/lib/supabase/verify-user";
import { rateLimit } from "@/lib/rate-limit";
import { cancelFibPayment } from "@/lib/fib";
import { notifyOrderCancelled } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A customer cancelling their own order — only while it is still a fresh
 * request. Once the shop has confirmed it, the customer has to contact the
 * shop. The status flip runs here (service role) because customers have no
 * UPDATE access to `orders`; the DB trigger returns the reserved stock.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "order-cancel", 10, 60_000);
  if (limited) return limited;

  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { orderId?: string } | null;
  const orderId = body?.orderId;
  if (!orderId || !UUID_RE.test(orderId)) {
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: order, error } = await admin
    .from("orders")
    .select("id, user_id, status, payment_method, payment_status, fib_payment_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });
  // Same answer for "not yours" and "doesn't exist" — don't leak order ids.
  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (order.status !== "requested") {
    return NextResponse.json({ error: "not_cancellable" }, { status: 409 });
  }

  // Compare-and-set on status so a concurrent confirm by the shop wins.
  const { data: updated, error: updateError } = await admin
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .eq("status", "requested")
    .select("id");
  if (updateError) return NextResponse.json({ error: "server_error" }, { status: 500 });
  if (!updated?.length) {
    return NextResponse.json({ error: "not_cancellable" }, { status: 409 });
  }

  // An unpaid FIB payment shouldn't stay payable on a cancelled order.
  if (order.payment_method === "fib" && order.payment_status === "pending" && order.fib_payment_id) {
    await cancelFibPayment(order.fib_payment_id).catch(() => {});
  }

  after(() => notifyOrderCancelled(orderId));
  return NextResponse.json({ ok: true });
}
