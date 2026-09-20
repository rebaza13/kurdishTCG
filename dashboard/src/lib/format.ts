import type { OrderStatus } from "@tcg/types";

/** The shop sells in Iraqi dinars (whole numbers). Old test orders may carry USD. */
export const CURRENCY = "IQD";

export function money(value: number | string, currency = CURRENCY): string {
  const n = Number(value);
  try {
    // Intl already uses 0 decimals for IQD and 2 for USD.
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(0)}`;
  }
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

/** lowercase-kebab slug; keeps the storefront URLs clean. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const ORDER_STATUSES: OrderStatus[] = [
  "requested",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  requested: "New request",
  confirmed: "Confirmed",
  shipped: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/**
 * Which statuses an order may move to from its current one. `shipped` needs
 * the enum value from supabase/migrations/0001_admin_dashboard.sql.
 */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["shipped", "delivered", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: ["requested"],
};

export const PRODUCT_TYPES = [
  "single_card",
  "booster_pack",
  "booster_box",
  "starter_deck",
  "blaster_box",
  "collection_box",
] as const;

export const PRODUCT_TYPE_LABEL: Record<(typeof PRODUCT_TYPES)[number], string> = {
  single_card: "Single card",
  booster_pack: "Booster pack",
  booster_box: "Booster box",
  starter_deck: "Starter deck",
  blaster_box: "Blaster box",
  collection_box: "Collection box",
};

export const RARITIES = [
  "common",
  "uncommon",
  "rare",
  "holo",
  "ultra",
  "secret",
  "promo",
] as const;
