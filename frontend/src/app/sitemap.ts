import type { MetadataRoute } from "next";
import { getFranchises, getProducts } from "@/lib/data";
import { locales, type Locale } from "@/i18n/routing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** All 3 locale URLs for one path (no locale prefix), e.g. `/franchises/avatar`. */
function languageMap(path: string): Record<Locale, string> {
  return Object.fromEntries(
    locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`])
  ) as Record<Locale, string>;
}

/** One sitemap entry per locale for a given path, each cross-linked via hreflang. */
function localizedEntries(
  path: string,
  extra?: Partial<MetadataRoute.Sitemap[number]>
): MetadataRoute.Sitemap {
  const languages = languageMap(path);
  return locales.map((locale) => ({
    url: languages[locale],
    alternates: { languages },
    ...extra,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Slugs are locale-independent, so one fetch (default locale) is enough.
  const [franchises, { items: products }] = await Promise.all([
    getFranchises(),
    getProducts(undefined, { pageSize: 100_000 }),
  ]);

  const entries: MetadataRoute.Sitemap = [
    ...localizedEntries("", { changeFrequency: "weekly", priority: 1 }),
    ...localizedEntries("/franchises", { changeFrequency: "weekly", priority: 0.9 }),
  ];

  for (const franchise of franchises) {
    entries.push(
      ...localizedEntries(`/franchises/${franchise.slug}`, {
        changeFrequency: "daily",
        priority: 0.8,
      })
    );
  }

  for (const product of products) {
    entries.push(
      ...localizedEntries(`/franchises/${product.franchise}/${product.slug}`, {
        changeFrequency: "daily",
        priority: 0.7,
      })
    );
  }

  return entries;
}
