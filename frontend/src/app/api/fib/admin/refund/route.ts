import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyAdmin } from "@/lib/supabase/verify-admin";
import { refundFibPayment, FibPayError } from "@/lib/fib";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * Called from the admin dashboard. FIB only allows refunding a PAID payment
 * within 24h of payment; after calling this the dashboard should poll (or
 * the customer's own order page polls) /api/fib/status until it flips to
 * REFUNDED.
 */
export async function POST(request: Request) {
  const headers = corsHeaders();
  const admin_user = await verifyAdmin(request);
  if (!admin_user) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
  }

  let body: { orderId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers });
  }
  if (!body.orderId) {
    return NextResponse.json({ error: "missing_order_id" }, { status: 400, headers });
  }

  const admin = getSupabaseAdmin();
  const { data: order, error } = await admin
    .from("orders")
    .select("id, payment_method, payment_status, fib_payment_id")
    .eq("id", body.orderId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500, headers });
  }
  if (!order || order.payment_method !== "fib" || !order.fib_payment_id) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers });
  }
  if (order.payment_status !== "paid") {
    return NextResponse.json({ error: "not_refundable" }, { status: 409, headers });
  }

  try {
    await refundFibPayment(order.fib_payment_id);
  } catch (err) {
    const message = err instanceof FibPayError ? err.message : "FIB refund failed";
    return NextResponse.json({ error: "fib_error", message }, { status: 502, headers });
  }

  await admin.from("orders").update({ payment_status: "refund_requested" }).eq("id", order.id);

  return NextResponse.json({ ok: true }, { headers });
}
