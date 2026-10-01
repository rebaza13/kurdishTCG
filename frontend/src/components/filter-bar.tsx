"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import type { ProductKind, Rarity } from "@tcg/types";

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

const headingClass =
  "mb-3 text-xs uppercase tracking-[0.12em] text-[var(--color-text-muted)] font-heading font-[var(--font-heading-weight)]";
const selectClass =
  "w-full min-w-0 border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] px-3 py-2 text-sm rounded-[var(--radius-xs)]";

export function FilterBar({
  sets,
  kindCounts,
}: {
  sets: string[];
  /** Singles/sealed counts; the type switch is hidden when only one kind exists. */
  kindCounts?: Record<ProductKind, number>;
}) {
  const t = useTranslations("listing");
  const rarityT = useTranslations("rarity");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Mobile: rarity/set/sort live behind a toggle so the grid stays above the fold.
  const [open, setOpen] = useState(false);

  const activeRarities =
    searchParams.get("rarity")?.split(",").filter(Boolean) ?? [];
  const activeSet = searchParams.get("set") ?? "";
  const activeSort = searchParams.get("sort") ?? "newest";
  const rawKind = searchParams.get("type");
  const activeKind: ProductKind | "" =
    rawKind === "singles" || rawKind === "sealed" ? rawKind : "";

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page");
    const qs = params.toString();
    router.push((qs ? `${pathname}?${qs}` : pathname) as never);
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

  const showKind =
    !!kindCounts &&
    (activeKind !== "" || (kindCounts.singles > 0 && kindCounts.sealed > 0));
  const kinds: Array<{
    value: ProductKind | "";
    label: string;
    count?: number;
  }> = [
    {
      value: "",
      label: t("kindAll"),
      count: kindCounts ? kindCounts.singles + kindCounts.sealed : undefined,
    },
    { value: "singles", label: t("kindSingles"), count: kindCounts?.singles },
    { value: "sealed", label: t("kindSealed"), count: kindCounts?.sealed },
  ];

  const hasFilters =
    activeRarities.length > 0 ||
    activeSet ||
    activeSort !== "newest" ||
    activeKind !== "";

  return (
    <aside className="flex min-w-0 shrink-0 flex-col gap-6 md:w-[240px] md:gap-8">
      {showKind && (
        <div>
          <h3 className={headingClass}>{t("kindLabel")}</h3>
          <div className="kt-seg" role="group" aria-label={t("kindLabel")}>
            {kinds.map((k) => (
              <button
                key={k.value || "all"}
                type="button"
                className="kt-seg__item"
                data-active={activeKind === k.value}
                aria-pressed={activeKind === k.value}
                onClick={() =>
                  updateParams((params) => {
                    if (k.value) params.set("type", k.value);
                    else params.delete("type");
                  })
                }
              >
                <span>{k.label}</span>
                {k.count != null && (
                  <span className="kt-seg__count">{k.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-controls="listing-filters"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center justify-between gap-3 rounded-[var(--radius-full)] border-[length:var(--border-width)] border-[var(--color-border)] px-4 text-sm font-semibold md:hidden"
      >
        <span className="flex items-center gap-2">
          {t("filters")}
          {(activeRarities.length > 0 || activeSet) && (
            <span
              className="size-1.5 rounded-full bg-[var(--color-accent)]"
              aria-hidden
            />
          )}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden
          className={
            open ? "rotate-180 transition-transform" : "transition-transform"
          }
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div
        id="listing-filters"
        className={
          (open ? "flex" : "hidden") + " flex-col gap-6 md:flex md:gap-8"
        }
      >
        <div>
          <h3 className={headingClass}>{t("rarity")}</h3>
          <div className="flex flex-wrap gap-1.5">
            {RARITIES.map((r) => {
              const on = activeRarities.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleRarity(r)}
                  className={`h-8 cursor-pointer rounded-[var(--radius-full)] border-[length:var(--border-width)] px-3 text-xs font-semibold transition-colors ${
                    on
                      ? "border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-bg)]"
                      : "border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-text-muted)]"
                  }`}
                >
                  {rarityT(r)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:gap-8">
          <div className="min-w-0">
            <label htmlFor="filter-set" className={`block ${headingClass}`}>
              {t("set")}
            </label>
            <select
              id="filter-set"
              value={activeSet}
              onChange={(e) =>
                updateParams((params) => {
                  if (e.target.value) params.set("set", e.target.value);
                  else params.delete("set");
                })
              }
              className={selectClass}
            >
              <option value="">—</option>
              {sets.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label htmlFor="filter-sort" className={`block ${headingClass}`}>
              {t("sortBy")}
            </label>
            <select
              id="filter-sort"
              value={activeSort}
              onChange={(e) =>
                updateParams((params) => params.set("sort", e.target.value))
              }
              className={selectClass}
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
                          : "sortRarity",
                  )}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push(pathname as never)}
          className="self-start cursor-pointer text-xs text-[var(--color-accent)] underline-offset-2 hover:underline"
        >
          {t("clearFilters")}
        </button>
      )}
    </aside>
  );
}
