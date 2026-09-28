"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/lib/cart-store";
import type { Franchise, Product } from "@tcg/types";

const URGENT_RARITIES = new Set(["ultra", "secret", "holo"]);

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Flies a small dot from the clicked add-button to the live cart badge
 * (header, ≥760px, or the bottom-nav FAB below it) and bounces the badge on
 * arrival — ported 1:1 from the mockup's `add()` method. Pure DOM/WAAPI, no
 * React state, since it's a one-shot effect outside the render tree.
 */
function flyToCart(button: HTMLElement) {
  const target = document.getElementById(window.innerWidth < 760 ? "mobile-cart-badge" : "header-cart-badge");
  if (!target || prefersReducedMotion()) return;
  const a = button.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const dot = document.createElement("div");
  Object.assign(dot.style, {
    position: "fixed",
    left: `${a.left + a.width / 2 - 9}px`,
    top: `${a.top + a.height / 2 - 9}px`,
    width: "18px",
    height: "18px",
    borderRadius: "5px",
    background: "var(--color-accent)",
    zIndex: "999",
    pointerEvents: "none",
  });
  document.body.appendChild(dot);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = dot.animate(
    [
      { transform: "translate(0,0) rotate(0) scale(1)" },
      { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 120}px) rotate(200deg) scale(1.3)`, offset: 0.5 },
      { transform: `translate(${dx}px,${dy}px) rotate(405deg) scale(.4)` },
    ],
    { duration: 700, easing: "cubic-bezier(.5,0,.5,1)" }
  );
  anim.onfinish = () => {
    dot.remove();
    target.animate([{ transform: "scale(1)" }, { transform: "scale(1.5)" }, { transform: "scale(1)" }], {
      duration: 450,
      easing: "cubic-bezier(.3,1.6,.5,1)",
    });
  };
}

export function HomeProductGrid({ products, franchises }: { products: Product[]; franchises: Franchise[] }) {
  const t = useTranslations("product");
  const home = useTranslations("home");
  const franchisesT = useTranslations("franchises");
  const rarityT = useTranslations("rarity");
  const locale = useLocale();
  const addItem = useCartStore((s) => s.addItem);

  const [filter, setFilter] = useState<string>("all");
  const [toast, setToast] = useState<string | null>(null);

  const byFranchise = useMemo(() => new Map(franchises.map((f) => [f.slug, f])), [franchises]);
  const visible = filter === "all" ? products : products.filter((p) => p.franchise === filter);

  function handleAdd(e: React.MouseEvent<HTMLButtonElement>, product: Product) {
    e.preventDefault();
    e.stopPropagation();
    flyToCart(e.currentTarget);
    addItem(product, 1);
    setToast(home("addedToCartToast", { name: product.name }));
    window.setTimeout(() => setToast(null), 2200);
  }

  return (
    <>
      <div className="kt-chip-row">
        <button type="button" className="kt-filter-chip" data-active={filter === "all"} onClick={() => setFilter("all")}>
          <span className="kt-filter-chip__swatch" style={{ background: "var(--color-accent)" }} aria-hidden />
          <span>{home("allFranchises")}</span>
        </button>
        {franchises.map((f) => (
          <button key={f.slug} type="button" className="kt-filter-chip" data-active={filter === f.slug} onClick={() => setFilter(f.slug)}>
            <span className="kt-filter-chip__swatch" style={{ background: f.accent }} aria-hidden />
            <span>{f.name}</span>
          </button>
        ))}
      </div>

      <div className="kt-product-grid">
        {visible.map((p) => {
          const f = byFranchise.get(p.franchise);
          const tag =
            p.stock > 0 && p.stock <= 5
              ? t("onlyLeft", { count: p.stock })
              : p.rarity && URGENT_RARITIES.has(p.rarity)
                ? rarityT(p.rarity)
                : null;
          return (
            <Link key={p.id} href={`/franchises/${p.franchise}/${p.slug}`} className="kt-product-card">
              <div className="kt-product-card__media" style={{ background: f ? `color-mix(in oklch, ${f.accent} 12%, var(--color-surface))` : undefined }}>
                <Image src={p.image} alt={p.name} fill sizes="(max-width: 760px) 45vw, 250px" className="object-contain" />
                {f && (
                  <span className="kt-product-card__franchise">
                    <span className="kt-product-card__swatch" style={{ background: f.accent }} aria-hidden />
                    <span>{f.name}</span>
                  </span>
                )}
                {tag && <span className="kt-product-card__tag">{tag}</span>}
              </div>
              <div className="kt-product-card__body">
                <span className="kt-product-card__set">{p.set}</span>
                <span className="kt-product-card__name">{p.name}</span>
                <div className="kt-product-card__footer">
                  <span className="kt-product-card__price">{formatPrice(p.price, locale)}</span>
                  <button
                    type="button"
                    className="kt-add-btn"
                    aria-label={t("addToCart")}
                    disabled={p.stock <= 0}
                    onClick={(e) => handleAdd(e, p)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>
              </div>
            </Link>
          );
        })}
        {visible.length === 0 && (
          <p style={{ gridColumn: "1 / -1", color: "var(--color-text-muted)", padding: "2rem 0" }}>{franchisesT("outOfStock")}</p>
        )}
      </div>

      {toast && (
        <div className="kt-toast" role="status">
          <span className="kt-toast__icon" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="m5 12 5 5 9-10" />
            </svg>
          </span>
          <span className="kt-toast__text">{toast}</span>
        </div>
      )}
    </>
  );
}
