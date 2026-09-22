import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyUser } from "@/lib/supabase/verify-user";
import { syncFibPaymentStatus } from "@/lib/fib-sync";

export const dynamic = "force-dynamic";

/**
 * Client-side polling fallback (the bank's recommended workflow: wait 15s
 * after creating a payment, then poll every 5s until PAID/DECLINED/REFUNDED
 * or the customer's own webhook fires first). Requires the order's owner —
 * re-checks status against FIB itself rather than only reading our cached
 * copy, so this doubles as the "did the webhook actually reach us" check.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/fib/status/[paymentId]">
) {
  const { paymentId } = await ctx.params;

  const user = await verifyUser(request);
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: order, error } = await admin
    .from("orders")
    .select("id, user_id")
    .eq("fib_payment_id", paymentId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const result = await syncFibPaymentStatus(paymentId);
    if (!result) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({
      orderId: result.order.id,
      orderStatus: result.order.status,
      paymentStatus: result.order.payment_status,
      fibStatus: result.fibStatus.status,
      decliningReason: result.fibStatus.decliningReason,
    });
  } catch {
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
