import { Suspense } from "react";
import type { Metadata } from "next";
import { HomeSkeleton } from "@/components/skeletons";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PackRipHero } from "@/components/pack-rip-hero";
import { FranchiseAccordion } from "@/components/franchise-accordion";
import { HomeProductGrid } from "@/components/home-product-grid";
import { NewsletterBanner } from "@/components/newsletter-banner";
import { Reveal } from "@/components/reveal";
import { EmptyState } from "@/components/empty-state";
import { getFeaturedProducts, getFranchises } from "@/lib/data";
import { localizedAlternates } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

// Catalog data doesn't change minute-to-minute — revalidate every 5 minutes
// instead of baking it in at build time forever (this route has no
// Request-time API, so without this it would cache indefinitely).
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t("siteName");
  const description = t("tagline");
  const alternates = localizedAlternates(locale, "");

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      siteName: title,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/**
 * The shell returns immediately and the catalog-dependent page streams in
 * behind a skeleton shaped like the real hero + sections, so a slow Supabase
 * read never leaves a blank screen (and nothing jumps when it resolves).
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent locale={locale} />
    </Suspense>
  );
}

async function HomeContent({ locale }: { locale: Locale }) {
  const [t, states, meta, franchises, featured, singles] = await Promise.all([
    getTranslations("home"),
    getTranslations("states"),
    getTranslations({ locale, namespace: "meta" }),
    getFranchises(locale),
    getFeaturedProducts(8, locale, "sealed"),
    getFeaturedProducts(8, locale, "singles"),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const siteName = meta("siteName");
  const tagline = meta("tagline");
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
    description: tagline,
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    description: tagline,
  };

  const marquee = [...franchises, ...franchises, ...franchises, ...franchises];

  return (
    <>
      {/* Trusted, server-generated JSON, not user input. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />

      {/* Clip the rotated marquee / hero ring so the page never scrolls sideways. */}
      <div className="kt-home">
      <PackRipHero franchises={franchises} />

      {franchises.length > 0 && (
        <div className="kt-marquee">
          <div className="kt-marquee__track">
            {marquee.map((f, i) => (
              <div key={`${f.slug}-${i}`} className="kt-marquee__item">
                <span>{f.name}</span>
                <span className="kt-marquee__swatch" style={{ background: f.accent }} aria-hidden />
              </div>
            ))}
          </div>
        </div>
      )}

      <section id="franchises" className="kt-section">
        <Reveal className="kt-section__head">
          <div className="kt-section__heading">
            <span className="kt-eyebrow">{t("franchisesKicker")}</span>
            <h2 className="kt-section__title">{t("franchisesTitle")}</h2>
          </div>
          <Link href="/franchises" className="kt-section__link">
            {t("viewAllFranchises")}
          </Link>
        </Reveal>
        <Reveal>
          {franchises.length > 0 ? (
            <FranchiseAccordion franchises={franchises} />
          ) : (
            <EmptyState title={states("emptyFranchisesTitle")} body={states("emptyFranchisesBody")} />
          )}
        </Reveal>
      </section>

      <section id="pulls" className="kt-section">
        <Reveal className="kt-section__head">
          <div className="kt-section__heading">
            <span className="kt-eyebrow">{t("sealedKicker")}</span>
            <h2 className="kt-section__title">{t("featuredTitle")}</h2>
          </div>
          <Link href="/search?type=sealed" className="kt-section__link">
            {t("viewAll")}
          </Link>
        </Reveal>
        {featured.length > 0 ? (
          <HomeProductGrid products={featured} franchises={franchises} />
        ) : (
          <EmptyState title={states("emptyProductsTitle")} body={states("emptyProductsBody")} />
        )}
      </section>

      {singles.length > 0 && (
        <section id="singles" className="kt-section">
          <Reveal className="kt-section__head">
            <div className="kt-section__heading">
              <span className="kt-eyebrow">{t("singlesKicker")}</span>
              <h2 className="kt-section__title">{t("singlesTitle")}</h2>
              <p className="kt-section__sub">{t("singlesBody")}</p>
            </div>
            <Link href="/search?type=singles" className="kt-section__link">
              {t("viewAllSingles")}
            </Link>
          </Reveal>
          <HomeProductGrid products={singles} franchises={franchises} />
        </section>
      )}

      <NewsletterBanner />
      </div>
    </>
  );
}
