import Image from "next/image";
import type { CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Franchise } from "@tcg/types";
import { cn, formatPrice } from "@/lib/utils";

/**
 * Franchise tile — same visual language as the product card: the cover
 * shot sits on a franchise-tinted plate (multiplied, so white studio
 * backdrops melt away) under a scrim that rises from the bottom, with the
 * name and stock line on top. Width comes from the caller's grid.
 */
export function FranchiseTile({
  franchise,
  className,
}: {
  franchise: Franchise;
  className?: string;
}) {
  const t = useTranslations("franchises");
  const locale = useLocale();
  return (
    <Link
      href={`/franchises/${franchise.slug}`}
      className={cn("kt-ftile group", className)}
      style={{ "--card-accent": franchise.accent } as CSSProperties}
    >
      <Image
        src={franchise.image}
        alt=""
        fill
        sizes="(max-width: 768px) 46vw, (max-width: 1280px) 30vw, 320px"
        className="kt-ftile__img"
      />
      <span className="kt-ftile__scrim" aria-hidden />
      {franchise.badge && <span className="kt-ftile__badge">{franchise.badge}</span>}
      <div className="kt-ftile__body">
        <h2 className="kt-ftile__name">{franchise.name}</h2>
        <div className="kt-ftile__row">
          <span className="kt-ftile__meta">
            {franchise.cardCount > 0 ? (
              <>
                <span>
                  {franchise.cardCount} {t("cards")}
                </span>
                <span>
                  {t("from")} {formatPrice(franchise.fromPrice, locale)}
                </span>
              </>
            ) : (
              <span>{t("outOfStock")}</span>
            )}
          </span>
          <span className="kt-ftile__go" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
