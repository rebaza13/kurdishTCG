"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/** Search box for the /search page — the phone/tablet entry point (header search is desktop-only). */
export function SearchForm({ initialQuery }: { initialQuery: string }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  return (
    <form
      role="search"
      className="mb-8 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const q = query.trim();
        router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
      }}
    >
      <label className="flex min-w-0 flex-1 items-center gap-2.5 border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 rounded-[var(--radius-sm)] focus-within:border-[var(--color-border-strong)]">
        <Search className="size-4 shrink-0 text-[var(--color-text-muted)]" />
        <input
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          // Tapping the Search tab should land in the box; skip it when showing results.
          autoFocus={!initialQuery}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full min-w-0 bg-transparent text-base outline-none placeholder:text-[var(--color-text-muted)] md:text-sm"
        />
      </label>
      <Button type="submit" size="lg" className="shrink-0 !py-3 text-sm">
        {t("search")}
      </Button>
    </form>
  );
}
