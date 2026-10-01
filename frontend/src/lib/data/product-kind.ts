import type { Product, ProductKind, Rarity } from "@tcg/types";

/**
 * Pure product-classification helpers — no data access, so client
 * components can import them without pulling in the Supabase client.
 */

/** True for loose single cards; false for any sealed product (packs, boxes, decks). */
export function isSingleCard(product: Pick<Product, "type">): boolean {
  return product.type === "single_card";
}

/** Normalises an untrusted `?type=` param to a known kind (or undefined). */
export function parseProductKind(value: string | undefined | null): ProductKind | undefined {
  return value === "singles" || value === "sealed" ? value : undefined;
}

/** Rarities that get the foil sheen + glowing edge on product cards. */
export const FOIL_RARITIES: ReadonlySet<Rarity> = new Set<Rarity>(["holo", "ultra", "secret"]);
