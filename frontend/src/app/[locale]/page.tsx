import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FranchiseTile } from "@/components/franchise-tile";
import { FranchiseShowcase } from "@/components/franchise-showcase";
import { FranchiseTicker } from "@/components/franchise-ticker";
import { HeroCardStage } from "@/components/hero-card-stage";
import { HeroContent, HeroTitleAccent } from "@/components/hero-content";
import { PacksSection } from "@/components/packs-section";
import { NewsletterBanner } from "@/components/newsletter-banner";
import { Reveal } from "@/components/reveal";
import { getFeaturedProducts, getFranchises, getProducts } from "@/lib/data";
import type { Locale } from "@/i18n/routing";

const PACKS_PAGE_SIZE = 24;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, franchises, featured, packs] = await Promise.all([
    getTranslations("home"),
    getFranchises(locale),
    getFeaturedProducts(8, locale),
    getProducts(undefined, { page: 1, pageSize: PACKS_PAGE_SIZE, sort: "newest" }, locale),
  ]);

  const totalStock = franchises.reduce((sum, f) => sum + f.cardCount, 0);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center gap-8 px-4 py-6 md:px-10 md:py-14">
        <HeroContent
          kicker={t("heroKicker")}
          title={t.rich("heroTitle", {
            accent: (chunks) => <HeroTitleAccent>{chunks}</HeroTitleAccent>,
          })}
          subtitle={t("heroSubtitle")}
          franchises={franchises}
          shopNowLabel={t("shopNow")}
          browseFranchisesLabel={t("browseFranchises")}
          stats={[
            { value: String(totalStock), label: t("statCards") },
            { value: String(franchises.length), label: t("statFranchises") },
            { value: t("statCashValue"), label: t("statCash") },
          ]}
        />

        <div className="hidden min-w-0 flex-1 basis-[480px] md:block">
          <HeroCardStage cards={featured} caption={t("heroBadge")} />
        </div>
      </section>

      <FranchiseTicker franchises={franchises} />

      {/* Franchises */}
      <section id="franchises" className="mx-auto max-w-[1320px] px-4 py-14 md:px-10 md:py-20">
        <Reveal className="mb-7 flex items-end justify-between gap-5 md:mb-8">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-xs font-bold tracking-[0.14em] text-[var(--color-accent)]">
              {t("franchisesKicker").toUpperCase()}
            </span>
            <h2 className="m-0 text-4xl md:text-6xl xl:text-7xl">{t("franchisesTitle")}</h2>
          </div>
          <Link href="/franchises" className="hidden shrink-0 items-center gap-2 border-b-2 border-current pb-1 font-heading text-base font-[var(--font-heading-weight)] sm:flex">
            {t("viewAll")}
          </Link>
        </Reveal>

        <Reveal>
          <FranchiseShowcase franchises={franchises} />
        </Reveal>

        {/* Phone + tablet: swipeable rail, bleeds to the screen edge */}
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {franchises.map((f) => (
            <FranchiseTile key={f.slug} franchise={f} className="w-[152px] snap-start sm:w-[190px]" />
          ))}
        </div>
      </section>

      {/* Packs — full catalog, paginated */}
      <PacksSection initial={packs} locale={locale} />

      {/* Newsletter */}
      <section className="mx-auto max-w-[1320px] px-4 pb-16 md:px-10 md:pb-24">
        <NewsletterBanner images={[packs.items[0]?.image, packs.items[1]?.image].filter(Boolean) as string[]} />
      </section>
    </div>
  );
}
