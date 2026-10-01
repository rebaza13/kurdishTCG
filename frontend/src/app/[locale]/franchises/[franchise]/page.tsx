import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/product-card";
import { FilterBar } from "@/components/filter-bar";
import { Button } from "@/components/ui/button";
import { getFranchise, getProducts, parseProductKind } from "@/lib/data";
import { FRANCHISE_ORDER } from "@/lib/data/franchises";
import { localizedAlternates } from "@/lib/seo";
import type { FranchiseSlug, Rarity } from "@tcg/types";
import type { Locale } from "@/i18n/routing";

export function generateStaticParams() {
  return FRANCHISE_ORDER.map((franchise) => ({ franchise }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; franchise: string }>;
}): Promise<Metadata> {
  const { locale, franchise: franchiseParam } = await params;
  const franchise = franchiseParam as FranchiseSlug;
  const [franchiseData, meta] = await Promise.all([
    getFranchise(franchise, locale),
    getTranslations({ locale, namespace: "meta" }),
  ]);
  const alternates = localizedAlternates(locale, `/franchises/${franchise}`);

  if (!franchiseData) {
    return {
      title: meta("siteName"),
      description: meta("tagline"),
      alternates,
    };
  }

  const title = franchiseData.name;
  const description = franchiseData.description || meta("tagline");

  return {
    title,
    description,
    alternates,
    openGraph: {
      title: `${title} · ${meta("siteName")}`,
      description,
      url: alternates.canonical,
      siteName: meta("siteName"),
      type: "website",
      images: franchiseData.image ? [{ url: franchiseData.image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: franchiseData.image ? [franchiseData.image] : undefined,
    },
  };
}

export default async function FranchiseListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; franchise: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale, franchise: franchiseParam } = await params;
  setRequestLocale(locale);

  const franchise = franchiseParam as FranchiseSlug;

  const sp = await searchParams;
  const page = Number(sp.page ?? 1) || 1;
  const rarity = sp.rarity?.split(",").filter(Boolean) as Rarity[] | undefined;
  const kind = parseProductKind(sp.type);

  const [franchiseData, t, franchiseT, result] = await Promise.all([
    getFranchise(franchise, locale),
    getTranslations("listing"),
    getTranslations("franchises"),
    getProducts(
      franchise,
      {
        page,
        pageSize: 24,
        kind,
        rarity,
        set: sp.set,
        query: sp.q,
        sort: (sp.sort as never) ?? "newest",
      },
      locale
    ),
  ]);

  if (!franchiseData) notFound();

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div>
      <div
        className="relative overflow-hidden"
        style={{
          // Darken the accent under the text so white copy stays AA on every
          // franchise colour (SpongeBob yellow included) in both themes.
          background: `linear-gradient(100deg, rgb(11 10 9 / 0.58), rgb(11 10 9 / 0.45)), ${franchiseData.accent}`,
        }}
      >
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-9 text-white md:flex-row md:items-end md:justify-between md:gap-8 md:px-10 md:py-12">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.16em] font-heading font-[var(--font-heading-weight)] opacity-90">
              {franchiseData.badge}
            </span>
            <h1 className="text-4xl md:text-6xl text-white break-words">{franchiseData.name}</h1>
          </div>
          <span className="font-mono text-xs opacity-90 md:text-sm">
            {franchiseData.cardCount} {franchiseT("cards")} · {franchiseData.setCount} {franchiseT("sets")}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-10 md:py-10 flex flex-col md:flex-row gap-8 md:gap-10">
        <FilterBar sets={result.sets} kindCounts={result.kindCounts} />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <p className="text-sm text-[var(--color-text-muted)]">
            {t("showingResults", { count: result.items.length, total: result.total })}
          </p>

          {result.items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] py-10">
              {franchiseData.cardCount === 0 ? t("noProductsYet") : t("noResults")}
            </p>
          ) : (
            <div className="kt-card-grid">
              {result.items.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  sizes="(max-width: 640px) 46vw, (max-width: 1280px) 28vw, 280px"
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t-[length:var(--border-width)] border-[var(--color-border)] pt-5 mt-4">
              <span className="text-xs text-[var(--color-text-muted)]">
                {t("page", { page, total: totalPages })}
              </span>
              <div className="flex gap-2">
                <PageLink franchise={franchise} sp={sp} page={Math.max(1, page - 1)} disabled={page <= 1}>
                  <span className="inline-block rtl:-scale-x-100">←</span>
                </PageLink>
                <PageLink
                  franchise={franchise}
                  sp={sp}
                  page={Math.min(totalPages, page + 1)}
                  disabled={page >= totalPages}
                >
                  <span className="inline-block rtl:-scale-x-100">→</span>
                </PageLink>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PageLink({
  franchise,
  sp,
  page,
  disabled,
  children,
}: {
  franchise: FranchiseSlug;
  sp: Record<string, string | undefined>;
  page: number;
  disabled?: boolean;
  children: ReactNode;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value && key !== "page") params.set(key, value);
  }
  params.set("page", String(page));

  return (
    <Link href={`/franchises/${franchise}?${params.toString()}`} aria-disabled={disabled}>
      <Button variant="outline" size="sm" disabled={disabled}>
        {children}
      </Button>
    </Link>
  );
}
