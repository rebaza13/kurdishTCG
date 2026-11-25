import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import type { ProductType, Rarity } from "@tcg/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { deletePublicImages } from "@/lib/r2";

type Admin = ReturnType<typeof getSupabaseAdmin>;

/** R2 prefix seller photos are uploaded under — and the only one cleanup may delete from. */
export const LISTING_PREFIX = "listings/";

export const PRODUCT_TYPES: ProductType[] = [
  "single_card",
  "booster_pack",
  "booster_box",
  "starter_deck",
  "blaster_box",
  "collection_box",
];
export const RARITIES: Rarity[] = ["common", "uncommon", "rare", "holo", "ultra", "secret", "promo"];
export const CONDITIONS = ["New", "Sealed", "Near mint", "Lightly played", "Used"] as const;
export const MAX_PHOTOS = 4;

/** Columns a seller sees for their own listings. */
export const LISTING_COLUMNS =
  "id, slug, franchise_slug, product_type, name_en, description_en, set_name, card_number, rarity, price, condition, image, images, stock, created_at";

export interface ListingInput {
  name: string;
  description: string;
  franchise: string;
  type: ProductType;
  set: string;
  cardNumber: string | null;
  rarity: Rarity | null;
  condition: string;
  price: number;
  stock: number;
  images: string[];
}

/**
 * Validate a create/update body from the Sell page. Returns the clean input,
 * or an error code. Image URLs must be ones this user uploaded through
 * /api/seller/upload (inside their own R2 folder).
 */
export function parseListing(
  body: Record<string, unknown>,
  userId: string
): { ok: true; value: ListingInput } | { ok: false; error: string } {
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const name = str(body.name, 120);
  const description = str(body.description, 2000);
  const franchise = str(body.franchise, 60);
  const set = str(body.set, 80);
  const cardNumber = str(body.cardNumber, 30) || null;
  const type = body.type as ProductType;
  const rarity = (body.rarity || null) as Rarity | null;
  const condition = str(body.condition, 40);
  const price = Number(body.price);
  const stock = Number(body.stock);
  const images = Array.isArray(body.images) ? body.images.filter((u) => typeof u === "string") : [];

  if (!name || !franchise) return { ok: false, error: "missing_fields" };
  if (!PRODUCT_TYPES.includes(type)) return { ok: false, error: "bad_type" };
  if (rarity && !RARITIES.includes(rarity)) return { ok: false, error: "bad_rarity" };
  if (!(CONDITIONS as readonly string[]).includes(condition)) return { ok: false, error: "bad_condition" };
  if (!Number.isFinite(price) || price < 250 || price > 100_000_000) return { ok: false, error: "bad_price" };
  if (!Number.isInteger(stock) || stock < 0 || stock > 999) return { ok: false, error: "bad_stock" };
  if (images.length === 0 || images.length > MAX_PHOTOS) return { ok: false, error: "bad_images" };

  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  const ownPrefix = `${base}/${LISTING_PREFIX}${userId}/`;
  if (!base || images.some((u) => !u.startsWith(ownPrefix) || u.includes(".."))) {
    return { ok: false, error: "bad_images" };
  }

  return {
    ok: true,
    value: {
      name,
      description,
      franchise,
      type,
      set: set || "-",
      cardNumber,
      // Rarity only means something for single cards.
      rarity: type === "single_card" ? rarity : null,
      condition,
      price: Math.round(price),
      stock,
      images,
    },
  };
}

/** The products columns a ListingInput writes (all three locales get the seller's text). */
export function listingColumns(v: ListingInput) {
  return {
    franchise_slug: v.franchise,
    product_type: v.type,
    name_en: v.name,
    name_ar: v.name,
    name_ckb: v.name,
    description_en: v.description,
    description_ar: v.description,
    description_ckb: v.description,
    set_name: v.set,
    card_number: v.cardNumber,
    rarity: v.rarity,
    condition: v.condition,
    price: v.price,
    stock: v.stock,
    image: v.images[0],
    images: v.images,
  };
}

/** Storefront caches product data for 60 s and pages for 5 min — flush both. */
export function revalidateStorefront() {
  revalidateTag("products", { expire: 0 });
  revalidatePath("/", "layout");
}

/** Does any non-cancelled order still have an unfinished line for this product? */
export async function hasOpenOrderLines(admin: Admin, productId: string): Promise<boolean> {
  const { data } = await admin
    .from("order_items")
    .select("id, seller_paid_at, buyer_received_at, orders!inner(status)")
    .eq("product_id", productId)
    .neq("orders.status", "cancelled")
    .or("seller_paid_at.is.null,buyer_received_at.is.null")
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/** Delete a listing row and its photos. */
export async function deleteListing(
  admin: Admin,
  listing: { id: string; seller_id: string; image: string; images: string[] | null }
) {
  const { error } = await admin.from("products").delete().eq("id", listing.id);
  if (error) throw error;
  await deletePublicImages(
    [listing.image, ...(listing.images ?? [])],
    `${LISTING_PREFIX}${listing.seller_id}/`
  );
}

/**
 * After a confirmation: every seller listing among `productIds` that is sold
 * out (stock 0) and has no unfinished order line left is deleted with its
 * photos, so finished sales don't keep using database / storage space.
 * Returns how many were removed. Never throws.
 */
export async function cleanupFinishedListings(admin: Admin, productIds: string[]): Promise<number> {
  let removed = 0;
  try {
    const ids = [...new Set(productIds.filter(Boolean))];
    if (ids.length === 0) return 0;
    const { data: listings } = await admin
      .from("products")
      .select("id, seller_id, image, images, stock")
      .in("id", ids)
      .not("seller_id", "is", null)
      .eq("stock", 0);

    for (const listing of listings ?? []) {
      if (await hasOpenOrderLines(admin, listing.id)) continue;
      await deleteListing(admin, listing);
      removed++;
    }
    if (removed > 0) revalidateStorefront();
  } catch (err) {
    console.error("[listings] cleanup failed:", err);
  }
  return removed;
}

/**
 * When every line of an order is confirmed by both sides, the order is done:
 * mark it delivered (unless it was cancelled). Lines sold by the shop itself
 * have no seller confirmation, so orders containing them keep the admin flow.
 */
export async function completeOrderIfFinished(admin: Admin, orderId: string) {
  const { data: lines } = await admin
    .from("order_items")
    .select("seller_id, seller_paid_at, buyer_received_at")
    .eq("order_id", orderId);
  if (!lines?.length) return;
  const done = lines.every((l) => l.seller_id && l.seller_paid_at && l.buyer_received_at);
  if (!done) return;
  await admin
    .from("orders")
    .update({ status: "delivered" })
    .eq("id", orderId)
    .neq("status", "cancelled");
}
