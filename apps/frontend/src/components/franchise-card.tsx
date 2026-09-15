import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Franchise } from "@tcg/types";
import { PriceTag } from "@/components/price-tag";

export function FranchiseCard({ franchise }: { franchise: Franchise }) {
  const t = useTranslations("franchises");
  return (
    <Link
      href={`/franchises/${franchise.slug}`}
      className="group flex flex-col overflow-hidden border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-surface)] rounded-[var(--radius-lg)] transition-[border-color,box-shadow] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-md)]"
    >
      <div
        className="h-1.5 shrink-0"
        style={{ background: franchise.accent }}
        aria-hidden
      />
      <div className="relative aspect-[4/5] overflow-hidden bg-[var(--color-neutral-200)]">
        <Image
          src={franchise.image}
          alt={franchise.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--image-fade)" }}
          aria-hidden
        />
      </div>
      <div
        className="relative flex flex-1 flex-col gap-3 p-5"
        style={{ marginTop: "calc(var(--image-overlap) * -1)" }}
      >
        <span
          className="inline-flex w-fit items-center px-2.5 py-1 text-[10px] font-heading font-[var(--font-heading-weight)] uppercase tracking-[0.12em] rounded-[var(--radius-full)]"
          style={{ background: franchise.accent, color: "var(--color-accent-ink)" }}
        >
          {franchise.badge}
        </span>
        <h3 className="text-xl">{franchise.name}</h3>
        <p className="text-sm text-[var(--color-text-muted)]">{franchise.description}</p>
        <div className="mt-auto flex items-center gap-5 border-t-[length:var(--border-width)] border-[var(--color-border)] pt-3">
          <div>
            <div className="font-heading font-[var(--font-heading-weight)] text-lg">
              {franchise.cardCount}
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)]">{t("cards")}</span>
          </div>
          <div>
            <div className="font-heading font-[var(--font-heading-weight)] text-lg">
              {franchise.setCount}
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)]">{t("sets")}</span>
          </div>
          <div>
            <PriceTag value={franchise.fromPrice} className="text-lg" />
            <div className="text-[11px] text-[var(--color-text-muted)]">{t("from")}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
