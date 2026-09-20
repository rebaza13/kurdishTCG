"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import type { Rarity } from "@tcg/types";

const RARITIES: Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "holo",
  "ultra",
  "secret",
  "promo",
];

const SORTS = ["newest", "price-asc", "price-desc", "rarity"] as const;

export function FilterBar({ sets }: { sets: string[] }) {
  const t = useTranslations("listing");
  const rarityT = useTranslations("rarity");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeRarities = searchParams.get("rarity")?.split(",").filter(Boolean) ?? [];
  const activeSet = searchParams.get("set") ?? "";
  const activeSort = searchParams.get("sort") ?? "newest";

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}` as never);
  }

  function toggleRarity(r: Rarity) {
    updateParams((params) => {
      const next = new Set(activeRarities);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      if (next.size) params.set("rarity", Array.from(next).join(","));
      else params.delete("rarity");
    });
  }

  const hasFilters = activeRarities.length > 0 || activeSet || activeSort !== "newest";

  return (
    <aside className="flex flex-col gap-8 md:w-[240px] shrink-0">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-muted)] font-heading font-[var(--font-heading-weight)]">
            {t("rarity")}
          </h3>
        </div>
        <div className="flex flex-col gap-2.5">
          {RARITIES.map((r) => (
            <label key={r} className="flex items-center gap-2.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={activeRarities.includes(r)}
                onChange={() => toggleRarity(r)}
                className="size-4 accent-[var(--color-accent)]"
              />
              {rarityT(r)}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-muted)] font-heading font-[var(--font-heading-weight)] mb-3">
          {t("set")}
        </h3>
        <select
          value={activeSet}
          onChange={(e) =>
            updateParams((params) => {
              if (e.target.value) params.set("set", e.target.value);
              else params.delete("set");
            })
          }
          className="w-full border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm rounded-[var(--radius-xs)]"
        >
          <option value="">—</option>
          {sets.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-muted)] font-heading font-[var(--font-heading-weight)] mb-3">
          {t("sortBy")}
        </h3>
        <select
          value={activeSort}
          onChange={(e) =>
            updateParams((params) => params.set("sort", e.target.value))
          }
          className="w-full border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm rounded-[var(--radius-xs)]"
        >
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {t(
                s === "newest"
                  ? "sortNewest"
                  : s === "price-asc"
                    ? "sortPriceAsc"
                    : s === "price-desc"
                      ? "sortPriceDesc"
                      : "sortRarity"
              )}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push(pathname as never)}
          className="text-xs text-start text-[var(--color-accent)] underline-offset-2 hover:underline cursor-pointer"
        >
          {t("clearFilters")}
        </button>
      )}
    </aside>
  );
}
