import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { RarityBadge } from "@/components/rarity-badge";
import { PriceTag } from "@/components/price-tag";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductCard } from "@/components/product-card";
import { getFranchise, getProductBySlug, getRelatedProducts } from "@/lib/data";
import { FRANCHISE_ORDER } from "@/lib/data/franchises";
import type { FranchiseSlug } from "@tcg/types";
import type { Locale } from "@/i18n/routing";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; franchise: string; slug: string }>;
}) {
  const { locale, franchise: franchiseParam, slug } = await params;
  setRequestLocale(locale);

  if (!FRANCHISE_ORDER.includes(franchiseParam as FranchiseSlug)) notFound();
  const franchise = franchiseParam as FranchiseSlug;

  const product = await getProductBySlug(franchise, slug, locale);
  if (!product) notFound();

  const [t, productType, franchiseData, related] = await Promise.all([
    getTranslations("product"),
    getTranslations("productType"),
    getFranchise(franchise, locale),
    getRelatedProducts(product, 4, locale),
  ]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 md:px-10">
      <nav className="text-xs text-[var(--color-text-muted)] mb-8 flex gap-2 flex-wrap">
        <Link href={`/franchises/${franchise}`} className="hover:text-[var(--color-accent)]">
          {franchiseData?.name ?? franchise}
        </Link>
        <span>/</span>
        <Link href={`/franchises/${franchise}`} className="hover:text-[var(--color-accent)]">
          {product.set}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 md:gap-16">
        <div className="relative mx-auto w-full max-w-[340px] md:max-w-none aspect-[3/4] overflow-hidden bg-[var(--color-neutral-200)] rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-[var(--color-border)]">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 45vw"
            className="object-cover"
            priority
          />
        </div>

        <div className="flex flex-col gap-5">
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

          <p className="text-sm text-[var(--color-text-muted)]">
            {product.stock > 0
              ? `${t("inStock")} ${product.stock <= 5 ? "· " + t("onlyLeft", { count: product.stock }) : ""}`
              : t("outOfStock")}
          </p>

          <AddToCartButton product={product} size="lg" className="w-full justify-center" />

          <div>
            <h2 className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-muted)] font-heading font-[var(--font-heading-weight)] mb-2">
              {t("description")}
            </h2>
            <p className="text-sm leading-relaxed">{product.description}</p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl mb-6">{t("related")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
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
