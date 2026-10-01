import { useTranslations } from "next-intl";
import { User } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { CartButton, CartDrawer } from "@/components/cart-drawer";
import { HeaderSearch } from "@/components/header-search";

const NAV_ITEMS = [
  { href: "/franchises", key: "franchises" },
  { href: "/search", key: "newArrivals" },
  { href: "/sell", key: "sellToUs" },
] as const;

/** Server component: only search, theme, locale and cart are client islands. */
export function Header() {
  const t = useTranslations("nav");
  const meta = useTranslations("meta");

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

        <HeaderSearch />

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
