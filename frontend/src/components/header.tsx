"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, User } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { CartButton, CartDrawer } from "@/components/cart-drawer";

const NAV_ITEMS = [
  { href: "/franchises", key: "franchises" },
  { href: "/search", key: "newArrivals" },
  { href: "/sell", key: "sellToUs" },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const meta = useTranslations("meta");
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
    <header className="kt-header">
      <div className="kt-header__inner">
        <Link href="/" className="kt-logo">
          <span className="kt-logo__mark" aria-hidden>
            <span />
            <span />
          </span>
          <span>
            {meta("siteName")
              .split(/(TCG)/i)
              .map((part, i) =>
                /^tcg$/i.test(part) ? (
                  <span key={i} className="kt-logo__accent">
                    {part}
                  </span>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
          </span>
        </Link>

        <nav className="kt-nav" aria-label={t("shop")}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.key} href={item.href}>
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="kt-header__spacer" />

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

        <div className="kt-header__actions">
          <LocaleSwitcher />
          <ThemeToggle />
          <div className="kt-desktop-only">
            <Link href="/account" className="kt-icon-btn" aria-label={t("account")}>
              <User className="size-[18px]" strokeWidth={1.8} />
            </Link>
            <CartButton />
          </div>
        </div>
      </div>

      <CartDrawer />
    </header>
  );
}
