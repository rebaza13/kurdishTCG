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
  { href: "/sell", key: "sellToUs" },
] as const;

function Logo() {
  const meta = useTranslations("meta");
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 text-lg font-heading font-[var(--font-heading-weight)] tracking-tight"
    >
      <span className="relative block h-[22px] w-[19px] flex-none">
        <span className="absolute inset-0 rotate-[-10deg] rounded-[4px] bg-[var(--color-text)]" />
        <span className="absolute inset-0 translate-x-[3px] rotate-[8deg] rounded-[4px] bg-[var(--color-accent)]" />
      </span>
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
}

export function Header() {
  const t = useTranslations("nav");
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <header className="sticky top-0 z-30 border-b-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-glass)] backdrop-blur-xl backdrop-saturate-150">
      {/* Phone + tablet: slim bar, navigation lives in <BottomNav /> */}
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 md:px-10 xl:hidden">
        <Logo />
        <div className="flex items-center gap-1.5">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>

      {/* Laptop + desktop */}
      <div className="mx-auto hidden max-w-[1440px] items-center gap-6 px-10 py-3 xl:flex">
        <Logo />

        <nav className="flex items-center gap-1 text-[15px] font-medium">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href as `/${string}`}
              className="whitespace-nowrap rounded-[var(--radius-full)] px-3.5 py-2 text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <form
          role="search"
          className="ms-auto flex h-11 w-[260px] items-center gap-2.5 rounded-[var(--radius-full)] bg-[var(--color-surface)] px-4 text-[var(--color-text-muted)]"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
          }}
        >
          <Search className="size-4 flex-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full min-w-0 bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
          />
        </form>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <Link href="/account">
            <Button type="button" variant="ghost" size="icon" className="border-[length:var(--border-width)] border-[var(--color-border)]" aria-label={t("account")}>
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
