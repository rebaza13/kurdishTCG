import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { RarityBadge } from "@/components/rarity-badge";
import { PriceTag } from "@/components/price-tag";
import { ProductGallery } from "@/components/product-gallery";
import { ProductPurchase } from "@/components/product-purchase";
import { ProductCard } from "@/components/product-card";
import { getFranchise, getProductBySlug, getRelatedProducts } from "@/lib/data";
import { buildGalleryImages } from "@/lib/utils";
import { localizedAlternates } from "@/lib/seo";
import type { FranchiseSlug } from "@tcg/types";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; franchise: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, franchise: franchiseParam, slug } = await params;
  const franchise = franchiseParam as FranchiseSlug;
  const [product, meta] = await Promise.all([
    getProductBySlug(franchise, slug, locale),
    getTranslations({ locale, namespace: "meta" }),
  ]);
  const alternates = localizedAlternates(locale, `/franchises/${franchise}/${slug}`);

  if (!product) {
    return {
      title: meta("siteName"),
      description: meta("tagline"),
      alternates,
    };
  }

  const title = product.name;
  const description = product.description || meta("tagline");

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
      images: product.image ? [{ url: product.image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.image ? [product.image] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; franchise: string; slug: string }>;
}) {
  const { locale, franchise: franchiseParam, slug } = await params;
  setRequestLocale(locale);

  const franchise = franchiseParam as FranchiseSlug;

  const product = await getProductBySlug(franchise, slug, locale);
  if (!product) notFound();

  const [t, productType, franchiseData, related] = await Promise.all([
    getTranslations("product"),
    getTranslations("productType"),
    getFranchise(franchise, locale),
    getRelatedProducts(product, 4, locale),
  ]);

  const galleryImages = buildGalleryImages(product.image, product.images);
  const lowStock = product.stock > 0 && product.stock <= 5;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: galleryImages,
    description: product.description,
    sku: product.id,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "IQD",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      {/* Trusted, server-generated JSON from our own DB — no user input reaches this. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <div className="mx-auto max-w-[1440px] px-4 py-10 md:px-10">
      <nav aria-label="Breadcrumb" className="text-xs text-[var(--color-text-muted)] mb-8 flex items-center gap-2 flex-wrap">
        {franchiseData && (
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-[var(--radius-full)]"
            style={{ background: franchiseData.accent }}
          />
        )}
        <Link href={`/franchises/${franchise}`} className="hover:text-[var(--color-accent)]">
          {franchiseData?.name ?? franchise}
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/franchises/${franchise}`} className="hover:text-[var(--color-accent)]">
          {product.set}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-[var(--color-text)]">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-[minmax(0,400px)_1fr] gap-10 md:gap-16 lg:gap-24 md:items-start">
        <div className="reveal mx-auto w-full max-w-[340px] md:max-w-none md:sticky md:top-24">
          <ProductGallery images={galleryImages} alt={product.name} />
        </div>

        <div className="reveal flex flex-col gap-5" style={{ animationDelay: "90ms" }}>
          {product.rarity && <RarityBadge rarity={product.rarity} />}
          <h1 className="text-3xl md:text-4xl">{product.name}</h1>
          <PriceTag value={product.price} className="text-3xl" />

          <dl className="grid grid-cols-2 gap-4 border-y-[length:var(--border-width)] border-[var(--color-border)] py-5">
            <Field label={t("set")} value={product.set} />
            <Field label={t("type")} value={productType(product.type)} />
            {product.cardNumber && <Field label={t("cardNumber")} value={product.cardNumber} />}
            <Field label={t("condition")} value={product.condition} />
            {product.grade && <Field label={t("grade")} value={product.grade} />}
          </dl>

          <div className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-[var(--radius-full)]"
              style={{ background: product.stock <= 0 ? "var(--color-text-muted)" : lowStock ? "var(--color-accent)" : "var(--color-text-muted)" }}
            />
            <span className="text-[var(--color-text-muted)]">
              {product.stock > 0
                ? lowStock
                  ? `${t("inStock")} · ${t("onlyLeft", { count: product.stock })}`
                  : t("inStock")
                : t("outOfStock")}
            </span>
          </div>

          <ProductPurchase product={product} />

          <div>
            <h2 className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-muted)] font-heading font-[var(--font-heading-weight)] mb-2">
              {t("description")}
            </h2>
            <p className="text-sm leading-relaxed max-w-[65ch]">{product.description}</p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-20 pt-10 border-t-[length:var(--border-width)] border-[var(--color-border-strong)]">
          <div className="flex items-end justify-between gap-6 mb-6">
            <div className="flex items-center gap-2.5">
              {franchiseData && (
                <span
                  aria-hidden
                  className="h-2.5 w-1 rounded-[var(--radius-full)]"
                  style={{ background: franchiseData.accent }}
                />
              )}
              <h2 className="text-2xl md:text-3xl">{t("related")}</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd className="font-heading font-[var(--font-heading-weight)] text-sm">{value}</dd>
    </div>
  );
}
