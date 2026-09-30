"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";
import type { ProductListResult } from "@tcg/types";

/** Page numbers to render, collapsing the middle into a single ellipsis once there are more than 7. */
function pageWindow(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const out: Array<number | "ellipsis"> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("ellipsis");
    out.push(p);
  });
  return out;
}

export function PacksSection({
  initial,
  locale,
}: {
  initial: ProductListResult;
  locale: Locale;
}) {
  const t = useTranslations("listing");
  const home = useTranslations("home");
  const [result, setResult] = useState(initial);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  async function goToPage(page: number) {
    if (page < 1 || page > totalPages || page === result.page || loading) return;

    const requestId = ++requestRef.current;
    setLoading(true);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      const res = await fetch(
        `/api/products?locale=${locale}&page=${page}&pageSize=${result.pageSize}`
      );
      if (!res.ok) throw new Error("request_failed");
      const data = (await res.json()) as ProductListResult;
      if (requestRef.current !== requestId) return; // a newer request has already landed
      setResult(data);
    } catch {
      // Leave the current page's items in place — the buttons stay usable to retry.
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }

  return (
    <section id="packs" ref={sectionRef} className="mx-auto max-w-[1320px] scroll-mt-20 px-4 pb-16 md:px-10">
      <div className="mb-7 flex items-end justify-between gap-5 md:mb-8">
        <div className="flex flex-col gap-3">
          <span className="font-mono text-xs font-bold tracking-[0.14em] text-[var(--color-accent)]">
            {home("packsKicker").toUpperCase()}
          </span>
          <h2 className="m-0 text-4xl md:text-6xl xl:text-7xl">{home("packsTitle")}</h2>
        </div>
      </div>

      <p className="mb-5 text-sm text-[var(--color-text-muted)]">
        {t("showingResults", { count: result.items.length, total: result.total })}
      </p>

      <div
        aria-busy={loading || undefined}
        className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
      >
        {loading
          ? Array.from({ length: result.pageSize }, (_, i) => <PackCardSkeleton key={i} />)
          : result.items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>

      {result.items.length === 0 && !loading && (
        <p className="py-10 text-sm text-[var(--color-text-muted)]">{t("noResults")}</p>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t-[length:var(--border-width)] border-[var(--color-border)] pt-6">
          <span className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            {t("page", { page: result.page, total: totalPages })}
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || result.page <= 1}
              onClick={() => goToPage(result.page - 1)}
            >
              ←
            </Button>

            {pageWindow(result.page, totalPages).map((p, i) =>
              p === "ellipsis" ? (
                <span key={`e${i}`} className="px-1.5 text-sm text-[var(--color-text-muted)]">
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  type="button"
                  variant={p === result.page ? "secondary" : "outline"}
                  size="sm"
                  disabled={loading}
                  onClick={() => goToPage(p)}
                  className="min-w-9 justify-center"
                >
                  {p}
                </Button>
              )
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || result.page >= totalPages}
              onClick={() => goToPage(result.page + 1)}
            >
              →
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function PackCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-2 rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-surface-2)] p-2">
      <div className="aspect-square rounded-[var(--radius-md)] bg-[var(--color-surface)]" />
      <div className="flex flex-col gap-2 px-1.5 pt-3 pb-1">
        <div className="h-2.5 w-2/5 rounded-full bg-[var(--color-surface)]" />
        <div className="h-3.5 w-4/5 rounded-full bg-[var(--color-surface)]" />
        <div className="mt-2 h-5 w-1/3 rounded-full bg-[var(--color-surface)]" />
      </div>
    </div>
  );
}
