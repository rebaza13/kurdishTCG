import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RarityBadge } from "@/components/rarity-badge";
import { PriceTag } from "@/components/price-tag";
import type { Product } from "@tcg/types";

export function ProductCard({ product }: { product: Product }) {
  const t = useTranslations("product");
  return (
    <Link
      href={`/franchises/${product.franchise}/${product.slug}`}
      className="group flex flex-col gap-2.5 border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-surface)] p-3 rounded-[var(--radius-md)] transition-colors hover:border-[var(--color-border-strong)]"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-xs)] bg-[var(--color-neutral-200)]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 18vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {product.stock <= 0 && (
          <span className="absolute inset-x-0 bottom-0 bg-[var(--color-bg)]/90 py-1.5 text-center text-[10px] font-heading font-[var(--font-heading-weight)] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            {t("outOfStock")}
          </span>
        )}
      </div>
      <RarityBadge rarity={product.rarity} />
      <span className="font-heading font-[var(--font-heading-weight)] text-[15px] leading-tight line-clamp-2 text-[var(--color-text)]">
        {product.name}
      </span>
      <span className="text-xs text-[var(--color-text-muted)]">{product.set}</span>
      <div className="mt-auto flex items-center justify-between border-t-[length:var(--border-width)] border-[var(--color-border)] pt-2.5">
        <PriceTag value={product.price} className="text-lg text-[var(--color-text)]" />
        {product.stock > 0 && product.stock <= 3 && (
          <span className="text-[11px] text-[var(--color-accent)]">
            {t("onlyLeft", { count: product.stock })}
          </span>
        )}
      </div>
    </Link>
  );
}
