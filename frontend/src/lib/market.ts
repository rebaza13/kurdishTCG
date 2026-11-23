import { getSupabaseClient } from "@/lib/supabase/client";
import type { CityCode } from "@/lib/iraq-cities";

/**
 * Community marketplace (customer-to-customer listings) — see
 * supabase/migrations/0008_marketplace.sql for the tables and rules.
 */

export const LISTING_KINDS = ["single", "pack", "bundle"] as const;
export type ListingKind = (typeof LISTING_KINDS)[number];

export const LISTING_CONDITIONS = ["sealed", "mint", "near_mint", "excellent", "good", "played"] as const;
export type ListingCondition = (typeof LISTING_CONDITIONS)[number];

export type ListingStatus = "active" | "paused" | "sold";
export type ContactChannel = "whatsapp" | "viber";

export const MARKET_ORDER_STATUSES = ["requested", "confirmed", "shipped", "delivered", "cancelled"] as const;
export type MarketOrderStatus = (typeof MARKET_ORDER_STATUSES)[number];

/** One photographed card (or pack face). `back` is optional — hover flips to it. */
export type ListingCardPhoto = { front: string; back?: string | null; name?: string | null };

export type Listing = {
  id: string;
  sellerId: string;
  kind: ListingKind;
  title: string;
  description: string;
  franchise: string | null;
  condition: ListingCondition;
  price: number;
  quantity: number;
  cardCount: number;
  cards: ListingCardPhoto[];
  cover: string;
  status: ListingStatus;
  sellerName: string;
  sellerCity: CityCode;
  createdAt: string;
};

export type SellerProfile = {
  user_id: string;
  display_name: string;
  phone: string;
  contact_channel: ContactChannel;
  city: CityCode;
  address: string;
};

export type MarketOrder = {
  id: string;
  listing_id: string | null;
  seller_id: string;
  buyer_id: string;
  listing_title: string;
  listing_cover: string;
  unit_price: number;
  quantity: number;
  total: number;
  buyer_name: string;
  buyer_phone: string;
  buyer_city: CityCode;
  buyer_address: string;
  notes: string | null;
  seller_name: string;
  seller_phone: string;
  seller_city: CityCode;
  status: MarketOrderStatus;
  notify_channel: ContactChannel | null;
  notify_status: "pending" | "sent" | "failed" | "skipped";
  created_at: string;
};

export const LISTING_COLUMNS =
  "id, seller_id, kind, title, description, franchise_slug, condition, price, quantity, card_count, cards, cover, status, seller_name, seller_city, created_at";

type ListingRow = {
  id: string;
  seller_id: string;
  kind: ListingKind;
  title: string;
  description: string;
  franchise_slug: string | null;
  condition: ListingCondition;
  price: number | string;
  quantity: number;
  card_count: number;
  cards: ListingCardPhoto[] | null;
  cover: string;
  status: ListingStatus;
  seller_name: string;
  seller_city: CityCode;
  created_at: string;
};

export function mapListingRow(row: ListingRow): Listing {
  return {
    id: row.id,
    sellerId: row.seller_id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    franchise: row.franchise_slug,
    condition: row.condition,
    price: Number(row.price),
    quantity: row.quantity,
    cardCount: row.card_count,
    cards: Array.isArray(row.cards) ? row.cards : [],
    cover: row.cover,
    status: row.status,
    sellerName: row.seller_name,
    sellerCity: row.seller_city,
    createdAt: row.created_at,
  };
}

export async function getListings({
  kind,
  franchise,
  limit = 48,
}: { kind?: ListingKind; franchise?: string; limit?: number } = {}): Promise<Listing[]> {
  let query = getSupabaseClient()
    .from("listings")
    .select(LISTING_COLUMNS)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (kind) query = query.eq("kind", kind);
  if (franchise) query = query.eq("franchise_slug", franchise);
  const { data, error } = await query;
  if (error) {
    console.error("getListings", error.message);
    return [];
  }
  return (data as ListingRow[]).map(mapListingRow);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getListing(id: string): Promise<Listing | null> {
  if (!UUID_RE.test(id)) return null;
  const { data } = await getSupabaseClient()
    .from("listings")
    .select(LISTING_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return data ? mapListingRow(data as ListingRow) : null;
}

/** `07xxxxxxxxx` → `9647xxxxxxxxx` (international, no plus) for wa.me / Viber / APIs. */
export function toInternational(phone: string): string {
  return `964${phone.replace(/^0/, "")}`;
}

/** Deep links that open a chat with an Iraqi number, with an optional pre-filled message. */
export function chatLinks(phone: string, text?: string) {
  const intl = toInternational(phone);
  return {
    whatsapp: `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ""}`,
    viber: `viber://chat?number=%2B${intl}${text ? `&draft=${encodeURIComponent(text)}` : ""}`,
  };
}
