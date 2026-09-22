/**
 * Shared types for the KurdishTCG storefront (`frontend/`) and the admin
 * dashboard (`dashboard/`). Both apps import this as `@tcg/types` through a
 * tsconfig path alias, so a Product/Order means the same thing everywhere.
 *
 * Keep in sync with `frontend/src/lib/supabase/schema.sql`.
 */

/**
 * Franchises are rows in the `franchises` table and are created from the
 * dashboard, so a slug is just a string — not a closed union.
 */
export type FranchiseSlug = string;

export type Rarity =
  | "common"
  | "uncommon"
  | "rare"
  | "holo"
  | "ultra"
  | "secret"
  | "promo";

export type ProductType =
  | "single_card"
  | "booster_pack"
  | "booster_box"
  | "starter_deck"
  | "blaster_box"
  | "collection_box";

export type OrderStatus =
  | "requested"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

/** Only meaningful when `paymentMethod` is `"fib"` — cash orders leave this unset. */
export type PaymentStatus =
  | "pending"
  | "paid"
  | "declined"
  | "refund_requested"
  | "refunded";

/** A franchise resolved to one locale, plus aggregates over its products. */
export interface Franchise {
  slug: FranchiseSlug;
  name: string;
  accent: string;
  badge: string;
  description: string;
  image: string;
  cardCount: number;
  setCount: number;
  fromPrice: number;
}

/** A product resolved to one locale. */
export interface Product {
  id: string;
  slug: string;
  franchise: FranchiseSlug;
  type: ProductType;
  name: string;
  set: string;
  cardNumber: string | null;
  rarity: Rarity | null;
  price: number;
  condition: string;
  grade: string | null;
  image: string;
  images: string[];
  description: string;
  stock: number;
  createdAt?: string;
}

export interface CartItem {
  productId: string;
  slug: string;
  franchise: FranchiseSlug;
  name: string;
  price: number;
  image: string;
  quantity: number;
  /** Stock as of when this was added to the cart — a soft cap for the
   * quantity stepper UI. Not authoritative: checkout re-validates against
   * live stock server-side regardless. */
  stock: number;
}

export type ProductSort = "newest" | "price-asc" | "price-desc" | "rarity";

export interface ProductFilters {
  rarity?: Rarity[];
  minPrice?: number;
  maxPrice?: number;
  set?: string;
  query?: string;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}

export interface ProductListResult {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  sets: string[];
}

export interface Order {
  id: string;
  userId: string | null;
  status: OrderStatus;
  paymentMethod: string;
  fullName: string;
  phone: string;
  city: string;
  address: string;
  notes: string | null;
  subtotal: number;
  total: number;
  currency: string;
  createdAt: string;
  paymentStatus?: PaymentStatus | null;
  fibPaymentId?: string | null;
  fibReadableCode?: string | null;
  fibValidUntil?: string | null;
  fibPaidAt?: string | null;
  fibDecliningReason?: string | null;
  fibDeclinedAt?: string | null;
  fibPaidByName?: string | null;
  fibPaidByIban?: string | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}
