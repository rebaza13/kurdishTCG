"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

export function HeaderSearch() {
  const t = useTranslations("nav");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // The search box advertises a "/" shortcut (the <kbd> hint) — honour it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const input = searchRef.current;
      if (!input || input.offsetParent === null) return; // hidden below 1180px
      e.preventDefault();
      input.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      className="kt-search"
      onSubmit={(e) => {
        e.preventDefault();
        if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }}
    >
      <Search className="size-[17px]" strokeWidth={2} aria-hidden />
      <input
        ref={searchRef}
        enterKeyHint="search"
        aria-label={t("search")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
      />
      <kbd aria-hidden>/</kbd>
    </form>
  );
}
