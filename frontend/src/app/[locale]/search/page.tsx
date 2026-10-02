import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/product-card";
import { SearchForm } from "@/components/search-form";
import { EmptyState } from "@/components/empty-state";
import { getFranchises, getProducts, parseProductKind } from "@/lib/data";
import type { ProductKind } from "@tcg/types";
import type { Locale } from "@/i18n/routing";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q, type } = await searchParams;
  const kind = parseProductKind(type);

  const [t, states, nav, result, franchises] = await Promise.all([
    getTranslations("listing"),
    getTranslations("states"),
    getTranslations("nav"),
    getProducts(undefined, { query: q, kind, pageSize: 60 }, locale),
    getFranchises(locale),
  ]);
  const byFranchise = new Map(franchises.map((f) => [f.slug, f]));
  const counts = result.kindCounts ?? { singles: 0, sealed: 0 };

  const tabs: Array<{ kind: ProductKind | undefined; label: string; count: number }> = [
    { kind: undefined, label: t("kindAll"), count: counts.singles + counts.sealed },
    { kind: "singles", label: t("kindSingles"), count: counts.singles },
    { kind: "sealed", label: t("kindSealed"), count: counts.sealed },
  ];
  const hrefFor = (k: ProductKind | undefined) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (k) sp.set("type", k);
    const qs = sp.toString();
    return qs ? `/search?${qs}` : "/search";
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-10 md:py-10">
      <SearchForm initialQuery={q ?? ""} />
      <h1 className="text-2xl md:text-3xl mb-2 break-words">{q ? <>&ldquo;{q}&rdquo;</> : nav("search")}</h1>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 md:mb-8">
        <p className="text-sm text-[var(--color-text-muted)]">
          {t("showingResults", { count: result.items.length, total: result.total })}
        </p>
        <nav className="kt-seg" aria-label={t("kindLabel")}>
          {tabs.map((tab) => (
            <Link
              key={tab.kind ?? "all"}
              href={hrefFor(tab.kind)}
              className="kt-seg__item"
              data-active={kind === tab.kind}
              aria-current={kind === tab.kind ? "page" : undefined}
            >
              <span>{tab.label}</span>
              <span className="kt-seg__count">{tab.count}</span>
            </Link>
          ))}
        </nav>
      </div>
      {result.items.length === 0 ? (
        // Empty shop vs. a query / type filter that matched nothing.
        counts.singles + counts.sealed === 0 && !q ? (
          <EmptyState
            title={states("emptyProductsTitle")}
            body={states("emptyProductsBody")}
            action={{ href: "/franchises", label: states("browseFranchises") }}
          />
        ) : (
          <EmptyState
            title={states("emptySearchTitle")}
            body={states("emptySearchBody")}
            action={{ href: "/search", label: states("browseAll") }}
            secondary={{ href: "/franchises", label: states("browseFranchises") }}
          />
        )
      ) : (
        <div className="kt-card-grid">
          {result.items.map((p) => (
            <ProductCard key={p.id} product={p} franchise={byFranchise.get(p.franchise)} />
          ))}
        </div>
      )}
    </div>
  );
}
