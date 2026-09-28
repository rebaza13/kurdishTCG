"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useCartCount, useCartStore } from "@/lib/cart-store";

type Tab = { href: string; key: "home" | "shop" | "search" | "account" };

const LEFT_TABS: Tab[] = [
  { href: "/", key: "home" },
  { href: "/franchises", key: "shop" },
];
const RIGHT_TABS: Tab[] = [
  { href: "/search", key: "search" },
  { href: "/account", key: "account" },
];

/**
 * Phone + tablet navigation (hidden ≥760px, where the header's own nav takes
 * over — see .kt-bottom-nav). A frosted glass floating bar with the cart
 * raised in the middle as a tilted red FAB, matching the KurdishTCG design.
 */
export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const toggleCart = useCartStore((s) => s.toggle);
  const count = useCartCount();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav className="kt-bottom-nav" aria-label={t("shop")}>
      {LEFT_TABS.map((item) => (
        <NavTab key={item.key} href={item.href} label={t(item.key)} active={isActive(item.href)} icon={ICONS[item.key]} />
      ))}

      <button type="button" className="kt-bottom-nav__cart" onClick={toggleCart} aria-label={t("cart")}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
          <path d="M5 8h14l-1.2 12H6.2z" />
          <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
        </svg>
        <span id="mobile-cart-badge" className="kt-bottom-nav__cart-badge">
          {count}
        </span>
      </button>

      {RIGHT_TABS.map((item) => (
        <NavTab key={item.key} href={item.href} label={t(item.key)} active={isActive(item.href)} icon={ICONS[item.key]} />
      ))}
    </nav>
  );
}

function NavTab({ href, label, active, icon }: { href: string; label: string; active: boolean; icon: React.ReactNode }) {
  return (
    <Link href={href as `/${string}`} aria-current={active ? "page" : undefined} className="kt-bottom-nav__tab" data-active={active || undefined}>
      <span className="kt-bottom-nav__tab-icon">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

const ICONS: Record<Tab["key"], React.ReactNode> = {
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z" />
    </svg>
  ),
  shop: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  ),
  search: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  ),
  account: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6" />
    </svg>
  ),
};
