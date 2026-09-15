"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, Search, User, X } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { CartDrawer } from "@/components/cart-drawer";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/franchises", key: "franchises" },
  { href: "/franchises?sort=newest", key: "newArrivals" },
  { href: "/franchises?graded=1", key: "graded" },
  { href: "/sell", key: "sellToUs" },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const meta = useTranslations("meta");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b-[length:var(--border-width)] border-[var(--color-border-strong)] bg-[var(--color-bg)]">
      <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-4 py-3.5 md:px-10">
        <Link href="/" className="text-lg font-heading font-[var(--font-heading-weight)] tracking-tight">
          {meta("siteName").split(/(TCG)/i).map((part, i) =>
            /^tcg$/i.test(part) ? (
              <span key={i} className="text-[var(--color-accent)]">
                {part}
              </span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href as `/${string}`}
              className="text-[var(--color-text)] hover:text-[var(--color-accent)]"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <form
          role="search"
          className="hidden md:flex ms-auto items-center gap-2 border-[length:var(--border-width)] border-[var(--color-border)] px-3 py-2 w-[260px] rounded-[var(--radius-xs)]"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
          }}
        >
          <Search className="size-3.5 text-[var(--color-text-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-transparent text-xs outline-none placeholder:text-[var(--color-text-muted)]"
          />
        </form>

        <div className="hidden md:flex items-center gap-2 ms-auto md:ms-0">
          <LocaleSwitcher />
          <ThemeToggle />
          <Link href="/account">
            <Button type="button" variant="ghost" size="icon" aria-label={t("account")}>
              <User className="size-4" />
            </Button>
          </Link>
          <CartDrawer />
        </div>

        <div className="flex md:hidden items-center gap-2 ms-auto">
          <CartDrawer />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t-[length:var(--border-width)] border-[var(--color-border)] px-4 py-4 flex flex-col gap-4">
          <form
            role="search"
            className="flex items-center gap-2 border-[length:var(--border-width)] border-[var(--color-border)] px-3 py-2 rounded-[var(--radius-xs)]"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) {
                router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                setMobileOpen(false);
              }
            }}
          >
            <Search className="size-3.5 text-[var(--color-text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full bg-transparent text-xs outline-none placeholder:text-[var(--color-text-muted)]"
            />
          </form>
          <nav className="flex flex-col gap-3 text-sm">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href as `/${string}`}
                onClick={() => setMobileOpen(false)}
                className="hover:text-[var(--color-accent)]"
              >
                {t(item.key)}
              </Link>
            ))}
            <Link href="/account" onClick={() => setMobileOpen(false)}>
              {t("account")}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}
