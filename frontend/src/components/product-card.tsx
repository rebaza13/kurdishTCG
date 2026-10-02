"use client";

import Image from "next/image";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/utils";
import { FOIL_RARITIES, isSingleCard } from "@/lib/data/product-kind";
import type { Franchise, Product } from "@tcg/types";

/**
 * Full-bleed product card: the image fills the card and a franchise-tinted
 * scrim rises from the bottom so the title/price read on top of it.
 *
 * - Single cards (≈63:88 portrait scans) fill edge to edge with `cover`.
 * - Sealed product (studio shots on white) sits `contain`ed on a lit,
 *   franchise-tinted "display plate"; `mix-blend-mode: multiply` melts the
 *   white photo background into the plate so boxes never look cropped.
 * - Holo/ultra/secret singles get a foil sheen + rarity-coloured edge.
 *
 * Pointer tilt/glare is driven by CSS custom properties set here and only
 * applied under `@media (hover: hover) and (prefers-reduced-motion:
 * no-preference)` in globals.css, so touch and reduced-motion users get a
 * still card. The whole card is clickable through a stretched link on the
 * title; `action` (e.g. an add-to-cart button) sits above that link.
 */
export function ProductCard({
  product,
  franchise,
  action,
  sizes = "(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 300px",
}: {
  product: Product;
  /** When given, shows the franchise chip and uses its accent. */
  franchise?: Pick<Franchise, "name" | "accent">;
  action?: ReactNode;
  sizes?: string;
}) {
  const t = useTranslations("product");
  const rarityT = useTranslations("rarity");
  const typeT = useTranslations("productType");
  const locale = useLocale();

  const single = isSingleCard(product);
  const foil = single && product.rarity != null && FOIL_RARITIES.has(product.rarity);
  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= 5;
  const bundleCount = product.bundleItems?.length ?? 0;
  const accent = franchise?.accent ?? `var(--color-${product.franchise}, var(--color-accent))`;

  const meta = single
    ? [product.rarity ? rarityT(product.rarity) : typeT(product.type), product.cardNumber && `#${product.cardNumber}`]
        .filter(Boolean)
        .join(" · ")
    : typeT(product.type);

  return (
    <article
      className="kt-card"
      data-kind={single ? "single" : "sealed"}
      data-rarity={product.rarity ?? undefined}
      data-foil={foil || undefined}
      data-soldout={soldOut || undefined}
      style={{ "--card-accent": accent } as CSSProperties}
      onPointerMove={trackPointer}
      onPointerLeave={resetPointer}
    >
      <div className="kt-card__media" aria-hidden>
        <Image src={product.image} alt="" fill sizes={sizes} className="kt-card__img" />
        {foil && <span className="kt-card__foil" />}
      </div>
      <span className="kt-card__glare" aria-hidden />
      <span className="kt-card__scrim" aria-hidden />

      <div className="kt-card__top">
        {franchise ? (
          <span className="kt-card__chip">
            <span className="kt-card__swatch" aria-hidden />
            <span className="truncate">{franchise.name}</span>
          </span>
        ) : (
          <span />
        )}
        {(soldOut || lowStock || bundleCount > 0) && (
          <div className="kt-card__tags">
            {bundleCount > 0 && (
              <span className="kt-card__tag" data-tone="bundle">
                {t("bundleTag", { count: bundleCount })}
              </span>
            )}
            {(soldOut || lowStock) && (
              <span className="kt-card__tag" data-tone={soldOut ? "muted" : "hot"}>
                {soldOut ? t("outOfStock") : t("onlyLeft", { count: product.stock })}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="kt-card__body">
        <span className="kt-card__meta">
          <span className="kt-card__dot" aria-hidden />
          <span className="truncate">{meta}</span>
        </span>
        <h3 className="kt-card__name">
          <Link href={`/franchises/${product.franchise}/${product.slug}`} className="kt-card__link">
            {product.name}
          </Link>
        </h3>
        <span className="kt-card__set">{product.set}</span>
        <div className="kt-card__footer">
          <span className="kt-card__price">{formatPrice(product.price, locale)}</span>
          {action}
        </div>
      </div>
    </article>
  );
}

function trackPointer(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
  el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  el.style.setProperty("--rx", `${((0.5 - y) * 7).toFixed(2)}deg`);
  el.style.setProperty("--ry", `${((x - 0.5) * 9).toFixed(2)}deg`);
}

function resetPointer(e: PointerEvent<HTMLElement>) {
  const s = e.currentTarget.style;
  for (const p of ["--mx", "--my", "--rx", "--ry"]) s.removeProperty(p);
}
