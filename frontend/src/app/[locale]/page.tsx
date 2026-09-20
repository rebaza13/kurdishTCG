import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { FranchiseCard } from "@/components/franchise-card";
import { HeroCardStage } from "@/components/hero-card-stage";
import { ProductCard } from "@/components/product-card";
import { getFeaturedProducts, getFranchises } from "@/lib/data";
import type { Locale } from "@/i18n/routing";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, franchises, featured] = await Promise.all([
    getTranslations("home"),
    getFranchises(locale),
    getFeaturedProducts(8, locale),
  ]);

  // Hero always leads with whatever the current top pull is — fully
  // dynamic, no hardcoded franchise preference.
  const heroCards = featured.slice(0, 3);
  const totalStock = franchises.reduce((sum, f) => sum + f.cardCount, 0);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="border-b-[length:var(--border-width)] border-[var(--color-border-strong)]">
       <div className="mx-auto grid max-w-[1440px] md:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-6 px-4 py-16 md:px-10 md:py-20 md:border-e-[length:var(--border-width)] border-[var(--color-border-strong)]">
          <span className="w-fit text-xs uppercase tracking-[0.16em] font-heading font-[var(--font-heading-weight)] px-3 py-1.5 border-[length:var(--border-width)] border-[var(--color-border)] text-[var(--color-accent-secondary)] rounded-[var(--radius-full)]">
            {t("heroKicker")}
          </span>
          <h1 className="text-4xl md:text-6xl max-w-[16ch]">
            {t.rich("heroTitle", {
              accent: (chunks) => <span className="gradient-text">{chunks}</span>,
            })}
          </h1>
          <p className="text-base text-[var(--color-text-muted)] max-w-[54ch]">
            {t("heroSubtitle")}
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            <Link href="/franchises">
              <Button size="lg">{t("shopNow")}</Button>
            </Link>
            <Link href="/franchises">
              <Button size="lg" variant="secondary">
                {t("browseFranchises")}
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-3 border-t-[length:var(--border-width)] border-[var(--color-border)] mt-4">
            <Stat value={String(totalStock)} label={t("statCards")} />
            <Stat value={String(franchises.length)} label={t("statFranchises")} border />
            <Stat value={t("statCashValue")} label={t("statCash")} border />
          </div>
        </div>
        <HeroCardStage cards={heroCards} caption={t("heroBadge")} />
       </div>
      </section>

      {/* Franchises */}
      <section className="border-b-[length:var(--border-width)] border-[var(--color-border-strong)]">
        <div className="mx-auto max-w-[1440px] px-4 py-16 md:px-10">
          <div className="flex items-end justify-between gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-heading font-[var(--font-heading-weight)]">
                {t("franchisesKicker")}
              </span>
              <h2 className="text-2xl md:text-3xl">{t("franchisesTitle")}</h2>
            </div>
            <Link href="/franchises" className="hidden md:block">
              <Button variant="outline">{t("viewAll")}</Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {franchises.map((f) => (
              <FranchiseCard key={f.slug} franchise={f} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured cards */}
      <section>
        <div className="mx-auto max-w-[1440px] px-4 py-16 md:px-10">
          <div className="flex items-end justify-between gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-heading font-[var(--font-heading-weight)]">
                {t("featuredKicker")}
              </span>
              <h2 className="text-2xl md:text-3xl">{t("featuredTitle")}</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label, border }: { value: string; label: string; border?: boolean }) {
  return (
    <div className={`py-5 ${border ? "border-s-[length:var(--border-width)] border-[var(--color-border)] ps-5" : ""}`}>
      <div className="font-heading font-[var(--font-heading-weight)] text-3xl leading-none">
        {value}
      </div>
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
    </div>
  );
}
