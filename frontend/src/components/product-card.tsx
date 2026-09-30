"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PriceTag } from "@/components/price-tag";
import { useCartStore } from "@/lib/cart-store";
import { flyToCart } from "@/lib/fly-to-cart";
import { franchiseColorVar } from "@/lib/franchise-colors";
import type { Product } from "@tcg/types";

const TAG_RARITY = new Set(["holo", "ultra", "secret"]);

export function ProductCard({ product }: { product: Product }) {
  const t = useTranslations("product");
  const rarityT = useTranslations("rarity");
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useCartStore((s) => s.showToast);
  const accent = franchiseColorVar(product.franchise);

  return (
    <article className="group flex flex-col gap-2 rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-surface-2)] p-2 transition-[transform,box-shadow] duration-300 hover:-translate-y-2 hover:-rotate-[0.6deg] hover:shadow-[var(--shadow-md)]">
      <Link href={`/franchises/${product.franchise}/${product.slug}`} className="block">
        <div
          className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] p-4"
          style={{ background: `color-mix(in oklch, ${accent} 12%, var(--color-surface-2))` }}
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 18vw"
            className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04]"
          />
          <span className="absolute start-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-[var(--radius-full)] bg-[var(--color-surface-2)] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] shadow-[var(--shadow-sm)]">
            <span className="h-1.5 w-1.5 rotate-45" style={{ background: accent }} />
          </span>
          {product.rarity && TAG_RARITY.has(product.rarity) && (
            <span className="absolute end-2.5 top-2.5 rounded-[var(--radius-full)] bg-[var(--color-accent)] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-white">
              {rarityT(product.rarity)}
            </span>
          )}
          {product.stock <= 0 && (
            <span className="absolute inset-x-0 bottom-0 bg-[var(--color-bg)]/90 py-1.5 text-center text-[10px] font-heading font-[var(--font-heading-weight)] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              {t("outOfStock")}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1 px-1.5 pt-3">
          <span className="font-mono text-[11px] text-[var(--color-text-muted)]">{product.set}</span>
          <span className="line-clamp-2 font-heading text-[15px] font-[var(--font-heading-weight)] leading-tight text-[var(--color-text)]">
            {product.name}
          </span>
        </div>
      </Link>

      <div className="mt-auto flex items-center justify-between gap-2 px-1.5 pb-1 pt-1.5">
        <PriceTag value={product.price} className="text-base text-[var(--color-text)]" />
        <button
          type="button"
          aria-label={t("addToCart")}
          disabled={product.stock <= 0}
          onClick={(e) => {
            addItem(product, 1);
            showToast(`${t("addedToCart")} · ${product.name}`);
            flyToCart(e.currentTarget);
          }}
          className="grid size-11 flex-none cursor-pointer place-items-center rounded-[var(--radius-full)] bg-[var(--color-text)] text-[var(--color-bg)] transition-transform duration-300 hover:rotate-90 hover:bg-[var(--color-accent)] hover:text-white active:scale-90 disabled:pointer-events-none disabled:opacity-40"
        >
          <Plus className="size-[18px]" strokeWidth={2.4} />
        </button>
      </div>
    </article>
  );
}
