/**
 * CSS custom-property references for the built-in franchise slugs — mirrors
 * the --color-<slug> tokens in globals.css. Used wherever a component only
 * has a product/franchise *slug* on hand (no accent hex from the DB row),
 * e.g. the pack-rip hero's burst cards. Falls back to the brand accent for
 * any franchise added later from the dashboard.
 */
const FRANCHISE_COLOR_VAR: Record<string, string> = {
  riftbound: "var(--color-riftbound)",
  naruto: "var(--color-naruto)",
  lorcana: "var(--color-lorcana)",
  avatar: "var(--color-avatar)",
  spongebob: "var(--color-spongebob)",
  zootopia: "var(--color-zootopia)",
};

export function franchiseColorVar(slug: string): string {
  return FRANCHISE_COLOR_VAR[slug] ?? "var(--color-accent)";
}
