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
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/products", label: "Products", icon: Package },
  { href: "/franchises", label: "Franchises", icon: Layers },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const STOREFRONT_URL =
  process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { state, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state.status === "signed-out") router.replace("/login");
  }, [state.status, router]);

  // Badge on "Orders": how many requests still need a confirmation call.
  const { data: newOrders } = useQuery(
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

  if (state.status !== "admin") {
    return <Spinner label="Checking your session…" />;
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-surface md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="flex h-full flex-col gap-4 p-3 md:p-4">
          <div className="hidden px-2 md:block">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              KurdishTCG
            </div>
            <div className="text-sm text-muted">Admin</div>
          </div>

          <nav className="flex gap-1 overflow-x-auto md:flex-col">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent/12 text-accent"
                      : "text-muted hover:bg-surface-2 hover:text-fg"
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                  {href === "/orders" && !!newOrders && (
                    <span className="ml-auto rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-fg">
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

      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
        {children}
        <div className="mt-10 flex items-center justify-between border-t border-line pt-4 text-xs text-muted md:hidden">
          <span className="truncate">{state.email}</span>
          <button type="button" onClick={() => signOut()} className="underline">
            Sign out
          </button>
        </div>
      </main>
    </div>
  );
}
