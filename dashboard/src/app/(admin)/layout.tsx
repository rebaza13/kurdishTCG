"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ExternalLink,
  Layers,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { ORDERS_CHANGED_EVENT, useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/products", label: "Products", icon: Package },
  { href: "/franchises", label: "Franchises", icon: Layers },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

// Same variable fib-admin.ts uses (see .env.example) — there is no
// NEXT_PUBLIC_STOREFRONT_URL, so this link always pointed at localhost.
const STOREFRONT_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { state, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state.status === "signed-out") router.replace("/login");
  }, [state.status, router]);

  // Badge on "Orders": how many requests still need a confirmation call.
  const { data: newOrders, reload: reloadBadge } = useQuery(
    async () => {
      if (state.status !== "admin") return 0;
      const { count, error } = await getSupabase()
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "requested");
      if (error) throw error;
      return count ?? 0;
    },
    [state.status, pathname]
  );

  // Order pages fire this after a status change so the badge doesn't lag
  // until the next navigation.
  useEffect(() => {
    window.addEventListener(ORDERS_CHANGED_EVENT, reloadBadge);
    return () => window.removeEventListener(ORDERS_CHANGED_EVENT, reloadBadge);
  }, [reloadBadge]);

  if (state.status !== "admin") {
    return <Spinner label="Checking your session…" />;
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur md:h-screen md:border-b-0 md:border-r md:bg-surface">
        <div className="flex h-full flex-col gap-2 md:gap-4 md:p-4">
          {/* Brand — on phones it shares a row with the sign-out button. */}
          <div className="flex items-center justify-between gap-3 px-4 pt-3 md:px-2 md:pt-0">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                KurdishTCG
              </div>
              <div className="text-sm text-muted">Admin</div>
            </div>
            <div className="flex items-center gap-1 md:hidden">
              <a
                href={STOREFRONT_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="View storefront"
                title="View storefront"
                className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
              >
                <ExternalLink className="size-4" />
              </a>
              <button
                type="button"
                onClick={() => signOut()}
                aria-label="Sign out"
                title={`Sign out ${state.email}`}
                className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>

          <nav
            aria-label="Main"
            className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2 md:flex-col md:overflow-visible md:p-0"
          >
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent/12 text-accent"
                      : "text-muted hover:bg-surface-2 hover:text-fg"
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                  {href === "/orders" && !!newOrders && (
                    <span className="ml-auto rounded-full bg-accent px-1.5 text-xs font-semibold tabular-nums text-accent-fg">
                      {newOrders}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto hidden flex-col gap-1 md:flex">
            <a
              href={STOREFRONT_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg"
            >
              <ExternalLink className="size-4" />
              View storefront
            </a>
            <div className="truncate px-3 pt-2 text-xs text-muted" title={state.email}>
              {state.email}
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-surface-2 hover:text-fg"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
