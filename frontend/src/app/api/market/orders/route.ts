import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyUser } from "@/lib/supabase/verify-user";
import { normalizeIraqiMobile } from "@/lib/phone";
import { isCityCode } from "@/lib/iraq-cities";
import { notifySeller, orderMessage, type OrderNotice } from "@/lib/notify-seller";
import { locales, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * Place a marketplace order (buyer → seller, cash on delivery).
 *
 * Signed-in buyers only — each order pings a real person's phone, so no
 * anonymous submissions. Priced from the listing row, never from the
 * request. Quantity is reserved by the `listing_orders_reserve` trigger;
 * `orderId` is client-generated so a double-submit returns the same order.
 */

interface Body {
  orderId?: string;
  listingId?: string;
  quantity?: number;
  fullName?: string;
  phone?: string;
  city?: string;
  address?: string;
  notes?: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "sign_in_required" }, { status: 401 });

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const orderId = body.orderId ?? "";
  const listingId = body.listingId ?? "";
  const quantity = Number(body.quantity ?? 1);
  const fullName = (body.fullName ?? "").trim();
  const phone = normalizeIraqiMobile(body.phone ?? "");
  const city = body.city;
  const address = (body.address ?? "").trim();
  const notes = body.notes?.trim() || null;

  if (!UUID_RE.test(orderId) || !UUID_RE.test(listingId)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!isCityCode(city)) return NextResponse.json({ error: "city_required" }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  if (fullName.length < 2 || address.length < 3) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (fullName.length > 120 || address.length > 500 || (notes?.length ?? 0) > 1000) {
    return NextResponse.json({ error: "field_too_long" }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return NextResponse.json({ error: "invalid_quantity" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Idempotent retry: same id from the same buyer → same order.
  const { data: existing } = await db
    .from("listing_orders")
    .select("id, buyer_id, seller_name, seller_phone, notify_channel, notify_status")
    .eq("id", orderId)
    .maybeSingle();
  if (existing) {
    if (existing.buyer_id !== user.id) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    return NextResponse.json(responseFor(existing));
  }

  const { data: listing } = await db
    .from("listings")
    .select("id, seller_id, title, cover, price, quantity, status")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || listing.status !== "active") {
    return NextResponse.json({ error: "unavailable" }, { status: 409 });
  }
  if (listing.seller_id === user.id) {
    return NextResponse.json({ error: "own_listing" }, { status: 400 });
  }
  if (listing.quantity < quantity) {
    return NextResponse.json({ error: "out_of_stock", available: listing.quantity }, { status: 409 });
  }

  const { data: seller } = await db
    .from("seller_profiles")
    .select("display_name, phone, contact_channel, city, locale")
    .eq("user_id", listing.seller_id)
    .maybeSingle();
  if (!seller) return NextResponse.json({ error: "unavailable" }, { status: 409 });

  const unitPrice = Number(listing.price);
  const total = unitPrice * quantity;

  const { error: insertError } = await db.from("listing_orders").insert({
    id: orderId,
    listing_id: listing.id,
    seller_id: listing.seller_id,
    buyer_id: user.id,
    listing_title: listing.title,
    listing_cover: listing.cover,
    unit_price: unitPrice,
    quantity,
    total,
    buyer_name: fullName,
    buyer_phone: phone,
    buyer_city: city,
    buyer_address: address,
    notes,
    seller_name: seller.display_name,
    seller_phone: seller.phone,
    seller_city: seller.city,
    notify_channel: seller.contact_channel,
  });
  if (insertError) {
    if (insertError.message.includes("out_of_stock")) {
      return NextResponse.json({ error: "out_of_stock" }, { status: 409 });
    }
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
    console.error("market order insert", insertError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const sellerLocale: Locale = locales.includes(seller.locale as Locale) ? (seller.locale as Locale) : "ckb";
  const notice: OrderNotice = {
    orderId,
    sellerPhone: seller.phone,
    sellerLocale,
    listingTitle: listing.title,
    quantity,
    total,
    buyerName: fullName,
    buyerPhone: phone,
    buyerCity: city,
    buyerAddress: address,
    notes,
  };
  const result = await notifySeller(notice, seller.contact_channel);
  await db
    .from("listing_orders")
    .update({
      notify_channel: result.channel ?? seller.contact_channel,
      notify_status: result.status,
      notify_ref: result.ref ?? null,
      notify_error: result.error ?? null,
      notified_at: result.status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", orderId);

  return NextResponse.json({
    ...responseFor({
      id: orderId,
      seller_name: seller.display_name,
      seller_phone: seller.phone,
      notify_channel: result.channel ?? seller.contact_channel,
      notify_status: result.status,
    }),
    // Pre-filled text for the buyer's "message the seller" buttons.
    message: orderMessage(notice),
  });
}

function responseFor(o: {
  id: string;
  seller_name: string;
  seller_phone: string;
  notify_channel: string | null;
  notify_status: string;
}) {
  return {
    orderId: o.id,
    sellerName: o.seller_name,
    sellerPhone: o.seller_phone,
    channel: o.notify_channel,
    notifyStatus: o.notify_status,
  };
}
