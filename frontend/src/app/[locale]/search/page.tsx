import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductCard } from "@/components/product-card";
import { SearchForm } from "@/components/search-form";
import { getProducts } from "@/lib/data";
import type { Locale } from "@/i18n/routing";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q } = await searchParams;

  const [t, nav, result] = await Promise.all([
    getTranslations("listing"),
    getTranslations("nav"),
    getProducts(undefined, { query: q, pageSize: 60 }, locale),
  ]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-10 md:py-10">
      <SearchForm initialQuery={q ?? ""} />
      <h1 className="text-2xl mb-2">{q ? <>&ldquo;{q}&rdquo;</> : nav("search")}</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-8">
        {t("showingResults", { count: result.items.length, total: result.total })}
      </p>
      {result.items.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t("noResults")}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {result.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
