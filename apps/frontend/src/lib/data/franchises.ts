import type { FranchiseSlug } from "@tcg/types";

/**
 * The full set of valid franchise slugs — mirrors the `FranchiseSlug` union
 * in packages/types. Used only for route validity checks and
 * generateStaticParams; every other bit of franchise content (name, badge,
 * description, image, accent) is admin-editable and lives in Supabase —
 * see `getFranchises`/`getFranchise` in `./index.ts`.
 */
export const FRANCHISE_ORDER: FranchiseSlug[] = [
  "riftbound",
  "naruto",
  "lorcana",
  "avatar",
  "spongebob",
  "zootopia",
];
