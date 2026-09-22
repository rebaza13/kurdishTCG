import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { FranchiseTile } from "@/components/franchise-tile";
import { PackShowcase } from "@/components/pack-showcase";
import { ProductCard } from "@/components/product-card";
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

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, meta, franchises, featured] = await Promise.all([
    getTranslations("home"),
    getTranslations({ locale, namespace: "meta" }),
    getFranchises(locale),
    getFeaturedProducts(8, locale),
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
      <div className="flex flex-col">
      {/* Hero — the card stage leads on every viewport; the copy column is a
          desktop-only complement so mobile doesn't have to scroll past it. */}
      <section className="border-b-[length:var(--border-width)] border-[var(--color-border-strong)]">
       <div className="mx-auto flex flex-col md:grid max-w-[1440px] md:grid-cols-[1fr_1.15fr]">
        <div className="order-2 md:order-1 flex flex-col gap-5 px-4 py-6 md:px-10 md:py-20 md:border-e-[length:var(--border-width)] border-[var(--color-border-strong)]">
          <h1 className="hidden md:block text-4xl md:text-6xl max-w-[18ch]">
            {t("heroTitle")}
          </h1>
          <p className="hidden md:block text-xl md:text-3xl max-w-[22ch] text-[var(--color-text-muted)]">
            {t("heroTitleSecondary")}
          </p>
          <p className="sr-only">{t("heroSubtitle")}</p>
          <div className="hidden md:flex flex-wrap gap-x-4 gap-y-2.5 max-w-[40ch] pt-1">
            {franchises.map((f) => (
              <Link
                key={f.slug}
                href={`/franchises/${f.slug}`}
                className="flex items-center gap-1.5 text-xs font-heading font-[var(--font-heading-weight)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                <span
                  className="h-2 w-2 rounded-[var(--radius-full)]"
                  style={{ background: f.accent }}
                  aria-hidden
                />
                {f.name}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-1">
            <Link href="/franchises">
              <Button size="lg">{t("shopNow")}</Button>
            </Link>
            <Link href="/franchises">
              <Button size="lg" variant="secondary">
                {t("browseFranchises")}
              </Button>
            </Link>
          </div>
          <span className="hidden md:block text-xs text-[var(--color-text-muted)]">
            {t("heroKicker")}
          </span>
        </div>
        <div className="order-1 md:order-2">
          <PackShowcase caption={t("heroBadge")} />
        </div>
       </div>
      </section>

      {/* Franchises */}
      <section className="border-b-[length:var(--border-width)] border-[var(--color-border-strong)]">
        <div className="mx-auto max-w-[1440px] px-4 py-10 md:px-10 md:py-14">
          <div className="flex items-end justify-between gap-6 mb-5 md:mb-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-heading font-[var(--font-heading-weight)]">
                {t("franchisesKicker")}
              </span>
              <h2 className="text-2xl md:text-3xl">{t("franchisesTitle")}</h2>
            </div>
            <Link
              href="/franchises"
              className="shrink-0 text-sm font-heading font-[var(--font-heading-weight)] text-[var(--color-accent)] hover:underline underline-offset-4"
            >
              {t("viewAll")}
            </Link>
          </div>
          {/* Swipeable rail: bleeds to the screen edge so it's obvious there's more */}
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 md:-mx-10 md:scroll-px-10 md:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {franchises.map((f) => (
              <FranchiseTile
                key={f.slug}
                franchise={f}
                className="w-[152px] snap-start sm:w-[190px] lg:w-[220px]"
              />
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
    </>
  );
}
