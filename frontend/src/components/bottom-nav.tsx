"use client";

import { useTranslations } from "next-intl";
import { House, LayoutGrid, Search, ShoppingBag, User, type LucideIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { useCartCount, useCartStore } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

type Tab = { href: string; key: "home" | "shop" | "search" | "account"; icon: LucideIcon };

const LEFT_TABS: Tab[] = [
  { href: "/", key: "home", icon: House },
  { href: "/franchises", key: "shop", icon: LayoutGrid },
];
const RIGHT_TABS: Tab[] = [
  { href: "/search", key: "search", icon: Search },
  { href: "/account", key: "account", icon: User },
];

const itemClass =
  "relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-heading font-[var(--font-heading-weight)] leading-none transition-colors";

/**
 * Phone + tablet navigation (hidden from `lg`, where the top header takes
 * over). A frosted floating bar: the page scrolls underneath it, the cart
 * sits raised in the middle with a live count. The active tab is marked by
 * a plain color change on the icon + label — no background shape.
 */
export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const cartOpen = useCartStore((s) => s.isOpen);
  const toggleCart = useCartStore((s) => s.toggle);
  const count = useCartCount();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const cartActive = cartOpen || isActive("/cart");

  const renderTab = (item: Tab) => (
    <NavTab
      key={item.key}
      href={item.href}
      label={t(item.key)}
      icon={item.icon}
      active={isActive(item.href)}
    />
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] xl:hidden">
      <nav
        aria-label={t("shop")}
        className="pointer-events-auto mx-auto flex h-16 max-w-[520px] items-stretch rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_70%,transparent)] px-1 shadow-[var(--shadow-lg)] backdrop-blur-2xl backdrop-saturate-150"
      >
        {LEFT_TABS.map(renderTab)}

        <button
          type="button"
          onClick={toggleCart}
          aria-label={t("cart")}
          aria-expanded={cartOpen}
          className={cn(itemClass, "cursor-pointer", cartActive ? "text-[var(--color-accent)]" : "text-[var(--color-text)]")}
        >
          <span className="relative -mt-6 grid size-14 place-items-center rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-[var(--color-bg)] text-[var(--color-accent-ink)] shadow-[var(--shadow-md)] [background:var(--gradient-primary)] transition-transform active:scale-95">
            <ShoppingBag className="size-6" strokeWidth={2.2} />
            {count > 0 && (
              <span className="absolute -end-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-[var(--radius-full)] bg-[var(--color-text)] px-1 text-[11px] text-[var(--color-bg)]">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </span>
          <span>{t("cart")}</span>
        </button>

        {RIGHT_TABS.map(renderTab)}
      </nav>
    </div>
  );
}

function NavTab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href as `/${string}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        itemClass,
        active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      )}
    >
      <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
      {label}
    </Link>
  );
}
