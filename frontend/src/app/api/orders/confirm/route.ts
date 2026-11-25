import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyUser } from "@/lib/supabase/verify-user";
import { rateLimit } from "@/lib/rate-limit";
import { cleanupFinishedListings, completeOrderIfFinished } from "@/lib/listings";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Two-sided completion of a marketplace sale:
 *
 *   { orderId, role: "seller" }             seller: "I received the money"
 *   { orderId, role: "buyer", sellerId }    buyer:  "I received my order"
 *
 * Applies to all of that seller's lines on the order. Once both sides have
 * confirmed, sold-out listings are deleted with their photos, and an order
 * whose every line is done is marked delivered.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "order-confirm", 20, 60_000);
  if (limited) return limited;
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { orderId?: string; role?: string; sellerId?: string }
    | null;
  const orderId = body?.orderId ?? "";
  const role = body?.role;
  if (!UUID_RE.test(orderId) || (role !== "seller" && role !== "buyer")) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let sellerId: string;
  if (role === "buyer") {
    if (order.user_id !== user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });
    sellerId = body?.sellerId ?? "";
    if (!UUID_RE.test(sellerId)) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  } else {
    sellerId = user.id;
  }
  if (order.status === "cancelled") {
    return NextResponse.json({ error: "order_cancelled" }, { status: 409 });
  }

  const column = role === "seller" ? "seller_paid_at" : "buyer_received_at";
  const { data: lines, error } = await admin
    .from("order_items")
    .update({ [column]: new Date().toISOString() })
    .eq("order_id", orderId)
    .eq("seller_id", sellerId)
    .is(column, null)
    .select("product_id");
  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });

  if (!lines?.length) {
    // Either already confirmed (fine — idempotent) or not this seller's order.
    const { count } = await admin
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId)
      .eq("seller_id", sellerId);
    if (!count) return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: all } = await admin
    .from("order_items")
    .select("product_id")
    .eq("order_id", orderId)
    .eq("seller_id", sellerId);
  const removed = await cleanupFinishedListings(
    admin,
    (all ?? []).map((l) => l.product_id as string)
  );
  await completeOrderIfFinished(admin, orderId);

  return NextResponse.json({ ok: true, removedListings: removed });
}
