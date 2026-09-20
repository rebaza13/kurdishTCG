import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Franchise } from "@tcg/types";
import { PriceTag } from "@/components/price-tag";
import { cn } from "@/lib/utils";

/** Compact franchise tile for horizontal rails — width comes from the caller. */
export function FranchiseTile({
  franchise,
  className,
}: {
  franchise: Franchise;
  className?: string;
}) {
  const t = useTranslations("franchises");
  return (
    <Link
      href={`/franchises/${franchise.slug}`}
      className={cn(
        "group flex shrink-0 flex-col overflow-hidden border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-surface)] rounded-[var(--radius-lg)] transition-[border-color,box-shadow] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-md)]",
        className
      )}
    >
      <div className="h-1 shrink-0" style={{ background: franchise.accent }} aria-hidden />
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-neutral-200)]">
        <Image
          src={franchise.image}
          alt=""
          fill
          sizes="(max-width: 640px) 150px, (max-width: 1024px) 190px, 220px"
          className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.05]"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(to top, rgb(0 0 0 / 0.45), transparent 55%)" }}
          aria-hidden
        />
        <span
          className="absolute start-2 bottom-2 inline-flex max-w-[calc(100%-1rem)] items-center truncate px-2 py-0.5 text-[9px] font-heading font-[var(--font-heading-weight)] uppercase tracking-[0.1em] rounded-[var(--radius-full)]"
          style={{ background: franchise.accent, color: "var(--color-accent-ink)" }}
        >
          {franchise.badge}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 px-3 py-2.5">
        <h3 className="truncate text-[15px] leading-tight">{franchise.name}</h3>
        <p className="flex items-baseline gap-1 truncate text-[11px] text-[var(--color-text-muted)]">
          <span>
            {franchise.cardCount} {t("cards")}
          </span>
          <span aria-hidden>·</span>
          <span>{t("from")}</span>
          <PriceTag value={franchise.fromPrice} className="text-[11px] text-[var(--color-text)]" />
        </p>
      </div>
    </Link>
  );
}
