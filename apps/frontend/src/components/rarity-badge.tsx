import { useTranslations } from "next-intl";
import type { Rarity } from "@tcg/types";

const RARITY_COLOR: Record<Rarity, string> = {
  common: "var(--color-neutral-600)",
  uncommon: "var(--color-neutral-700)",
  rare: "var(--color-accent-secondary)",
  holo: "var(--color-accent-500)",
  ultra: "var(--color-accent)",
  secret: "var(--color-accent-tertiary)",
  promo: "var(--color-accent-secondary)",
};

export function RarityBadge({ rarity, className }: { rarity: Rarity | null; className?: string }) {
  const t = useTranslations("rarity");
  if (!rarity) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-heading font-[var(--font-heading-weight)] uppercase tracking-[0.12em] ${className ?? ""}`}
      style={{ color: RARITY_COLOR[rarity] }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: RARITY_COLOR[rarity] }}
      />
      {t(rarity)}
    </span>
  );
}
