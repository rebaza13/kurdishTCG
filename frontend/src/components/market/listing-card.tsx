"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { FlipCard } from "@/components/market/flip-card";
import { cityName } from "@/lib/iraq-cities";
import { formatPrice } from "@/lib/utils";
import type { Listing } from "@/lib/market";

/**
 * Marketplace tile. The cover card flips to its back on hover; bundles fan
 * the next two cards out behind it so "10 cards" reads at a glance.
 * `href` null renders a non-link preview (the sell form's live preview).
 */
export function ListingCard({
  listing,
  href,
  footer,
  sizes,
}: {
  listing: Pick<Listing, "kind" | "title" | "price" | "cards" | "cardCount" | "sellerCity" | "status" | "condition"> & {
    id?: string;
    franchise?: string | null;
  };
  href?: string | null;
  footer?: ReactNode;
  sizes?: string;
}) {
  const t = useTranslations("market");
  const locale = useLocale();
  const [first, ...rest] = listing.cards;
  const fan = listing.kind === "bundle" ? rest.slice(0, 2) : [];
  const link = href === undefined && listing.id ? `/market/${listing.id}` : href;
  const accent = listing.franchise ? `var(--color-${listing.franchise}, var(--color-accent))` : "var(--color-accent)";

  return (
    <article
      className="kt-lcard"
      data-kind={listing.kind}
      data-sold={listing.status === "sold" || undefined}
      style={{ "--card-accent": accent } as CSSProperties}
    >
      <div className="kt-lcard__stage">
        {fan.map((c, i) => (
          <span key={i} className="kt-lcard__fan" data-i={i} aria-hidden>
            <Image src={c.front} alt="" fill sizes="160px" className="object-cover" />
          </span>
        ))}
        {first ? (
          <FlipCard
            front={first.front}
            back={first.back}
            alt={listing.title}
            sizes={sizes}
            className="kt-lcard__flip"
          />
        ) : (
          <div className="kt-lcard__placeholder kt-flip" aria-hidden />
        )}
        <span className="kt-lcard__kind">
          {listing.kind === "bundle" ? t("bundleOf", { count: listing.cardCount }) : t(`kind.${listing.kind}`)}
        </span>
        {listing.status === "sold" && <span className="kt-lcard__sold">{t("sold")}</span>}
      </div>

      <div className="kt-lcard__body">
        <h3 className="kt-lcard__title">
          {link ? (
            <Link href={link as `/${string}`} className="kt-lcard__link">
              {listing.title || t("untitled")}
            </Link>
          ) : (
            listing.title || t("untitled")
          )}
        </h3>
        <div className="kt-lcard__meta">
          <span className="kt-lcard__city">
            <MapPin className="size-3" strokeWidth={2.4} />
            {cityName(listing.sellerCity, locale)}
          </span>
          <span>{t(`condition.${listing.condition}`)}</span>
        </div>
        <div className="kt-lcard__footer">
          <span className="kt-lcard__price">{formatPrice(listing.price, locale)}</span>
          {footer}
        </div>
      </div>
    </article>
  );
}
