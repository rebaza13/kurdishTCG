import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyUser } from "@/lib/supabase/verify-user";

export const dynamic = "force-dynamic";

type Line = {
  id: string;
  order_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  seller_paid_at: string | null;
  buyer_received_at: string | null;
  orders: {
    id: string;
    status: string;
    full_name: string;
    phone: string;
    city: string;
    address: string;
    notes: string | null;
    created_at: string;
  };
};

/**
 * Orders containing the signed-in seller's listings, grouped per order, with
 * the buyer's contact details so the seller can arrange delivery + payment.
 * Only the seller's own lines are returned, never other sellers' items.
 */
export async function GET(request: Request) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from("order_items")
    .select(
      "id, order_id, product_name, product_image, quantity, unit_price, seller_paid_at, buyer_received_at, orders!inner(id, status, full_name, phone, city, address, notes, created_at)"
    )
    .eq("seller_id", user.id)
    .limit(500);
  if (error) {
    console.error("[seller/orders]", error.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const byOrder = new Map<string, {
    id: string;
    status: string;
    createdAt: string;
    buyer: { name: string; phone: string; city: string; address: string; notes: string | null };
    items: { id: string; name: string; image: string | null; quantity: number; unitPrice: number }[];
    total: number;
    sellerPaidAt: string | null;
    buyerReceivedAt: string | null;
  }>();

  for (const line of (data ?? []) as unknown as Line[]) {
    const o = line.orders;
    let entry = byOrder.get(o.id);
    if (!entry) {
      const cancelled = o.status === "cancelled";
      entry = {
        id: o.id,
        status: o.status,
        createdAt: o.created_at,
        // A cancelled order's buyer details aren't the seller's business any more.
        buyer: cancelled
          ? { name: o.full_name, phone: "", city: "", address: "", notes: null }
          : { name: o.full_name, phone: o.phone, city: o.city, address: o.address, notes: o.notes },
        items: [],
        total: 0,
        sellerPaidAt: line.seller_paid_at,
        buyerReceivedAt: line.buyer_received_at,
      };
      byOrder.set(o.id, entry);
    }
    entry.items.push({
      id: line.id,
      name: line.product_name,
      image: line.product_image,
      quantity: line.quantity,
      unitPrice: Number(line.unit_price),
    });
    entry.total += Number(line.unit_price) * line.quantity;
    // The group counts as confirmed only when every line is.
    if (!line.seller_paid_at) entry.sellerPaidAt = null;
    if (!line.buyer_received_at) entry.buyerReceivedAt = null;
  }

  const orders = [...byOrder.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ orders });
}
