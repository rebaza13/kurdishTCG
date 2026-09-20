"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, User } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { CartButton, CartDrawer } from "@/components/cart-drawer";
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

  const logo = (
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
  );

  return (
    <header className="sticky top-0 z-30 border-b-[length:var(--border-width)] border-[var(--color-border-strong)] bg-[color-mix(in_srgb,var(--color-bg)_78%,transparent)] backdrop-blur-xl backdrop-saturate-150 xl:bg-[var(--color-bg)] xl:backdrop-blur-none">
      {/* Phone + tablet: slim bar, navigation lives in <BottomNav /> */}
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 md:px-10 xl:hidden">
        {logo}
        <div className="flex items-center gap-1.5">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>

      {/* Laptop + desktop */}
      <div className="mx-auto hidden max-w-[1440px] items-center gap-6 px-10 py-3.5 xl:flex">
        {logo}

        <nav className="flex items-center gap-6 text-sm">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href as `/${string}`}
              className="whitespace-nowrap text-[var(--color-text)] hover:text-[var(--color-accent)]"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <form
          role="search"
          className="ms-auto flex w-[260px] items-center gap-2 border-[length:var(--border-width)] border-[var(--color-border)] px-3 py-2 rounded-[var(--radius-xs)]"
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

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <Link href="/account">
            <Button type="button" variant="ghost" size="icon" aria-label={t("account")}>
              <User className="size-4" />
            </Button>
          </Link>
          <CartButton />
        </div>
      </div>

      <CartDrawer />
    </header>
  );
}
