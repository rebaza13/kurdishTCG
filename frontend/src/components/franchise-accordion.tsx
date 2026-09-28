"use client";

import Image from "next/image";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/utils";
import type { Franchise } from "@tcg/types";

/**
 * Desktop: six panels in a row, the hovered one grows to reveal its badge,
 * name, meta and a CTA — an accordion, not a carousel. Mobile: a horizontal
 * snap rail instead (no hover target to drive an accordion on touch).
 */
export function FranchiseAccordion({ franchises }: { franchises: Franchise[] }) {
  const t = useTranslations("franchises");
  const home = useTranslations("home");
  const locale = useLocale();
  const [active, setActive] = useState(Math.min(1, franchises.length - 1));

  const meta = (f: Franchise) =>
    f.cardCount > 0 ? (
      <>
        {f.cardCount} {t("cards")} · {t("from")} {formatPrice(f.fromPrice, locale)}
      </>
    ) : (
      t("outOfStock")
    );

  return (
    <>
      <div className="kt-franchise-row">
        {franchises.map((f, i) => {
          const on = active === i;
          return (
            <Link
              key={f.slug}
              href={`/franchises/${f.slug}`}
              className="kt-franchise-panel"
              onMouseEnter={() => setActive(i)}
              style={{ flex: on ? "4.2 1 0" : "1 1 0" }}
            >
              <Image
                src={f.image}
                alt={f.name}
                fill
                sizes="(max-width: 1320px) 20vw, 260px"
                className="object-cover"
                style={{ transform: `scale(${on ? 1.02 : 1.14})` }}
              />
              <span className="kt-franchise-panel__scrim" aria-hidden />
              <span className="kt-franchise-panel__top" style={{ background: f.accent }} aria-hidden />
              <span className="kt-franchise-panel__vert" style={{ opacity: on ? 0 : 1 }}>
                {f.name}
              </span>
              <div
                className="kt-franchise-panel__body"
                style={{ opacity: on ? 1 : 0, transform: `translateY(${on ? 0 : 24}px)` }}
              >
                <span className="kt-franchise-panel__badge" style={{ background: f.accent }}>
                  {f.badge}
                </span>
                <span className="kt-franchise-panel__name">{f.name}</span>
                <div className="kt-franchise-panel__meta-row">
                  <span className="kt-franchise-panel__meta">{meta(f)}</span>
                  <span className="kt-franchise-panel__cta">{home("shopFranchiseCta", { name: f.name })}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="kt-franchise-rail">
        {franchises.map((f) => (
          <Link key={f.slug} href={`/franchises/${f.slug}`} className="kt-franchise-card">
            <Image src={f.image} alt={f.name} fill sizes="76vw" className="object-cover" />
            <span className="kt-franchise-card__scrim" aria-hidden />
            <span className="kt-franchise-card__top" style={{ background: f.accent }} aria-hidden />
            <div className="kt-franchise-card__body">
              <span className="kt-franchise-card__badge" style={{ background: f.accent }}>
                {f.badge}
              </span>
              <span className="kt-franchise-card__name">{f.name}</span>
              <span className="kt-franchise-card__meta">{meta(f)}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
