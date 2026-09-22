import { locales, type Locale } from "@/i18n/routing";

/**
 * Builds `alternates.canonical` + `alternates.languages` for a route whose
 * path shape (after the locale prefix) is identical across en/ar/ckb — e.g.
 * `/franchises/avatar`. Relative to `metadataBase` (set in the root
 * `[locale]/layout.tsx`), so these resolve against `NEXT_PUBLIC_SITE_URL`.
 */
export function localizedAlternates(locale: Locale, path: string) {
  const languages = Object.fromEntries(
    locales.map((l) => [l, `/${l}${path}`])
  ) as Record<Locale, string>;

  return {
    canonical: `/${locale}${path}`,
    languages,
  };
}
