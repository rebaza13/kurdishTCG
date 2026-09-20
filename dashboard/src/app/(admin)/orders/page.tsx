"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import type { OrderStatus } from "@tcg/types";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { ORDER_STATUSES, STATUS_LABEL, dateTime, money, shortId } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, EmptyState, Input, Notice, PageHeader, Spinner, StatusBadge } from "@/components/ui";

interface OrderRow {
  id: string;
  status: OrderStatus;
  full_name: string;
  phone: string;
  city: string;
  total: number | string;
  currency: string;
  created_at: string;
  order_items: { quantity: number }[];
}

async function loadOrders() {
  const { data, error } = await getSupabase()
    .from("orders")
    .select("id,status,full_name,phone,city,total,currency,created_at,order_items(quantity)")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as OrderRow[];
}

function OrdersView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const { data, error } = useQuery(loadOrders, []);

  const raw = params.get("status");
  const active = ORDER_STATUSES.find((s) => s === raw) ?? "all";

  function setStatus(next: OrderStatus | "all") {
    router.replace(next === "all" ? pathname : `${pathname}?status=${next}`);
  }

  if (!data) {
    return error ? <Notice>{error}</Notice> : <Spinner />;
  }

  const counts = new Map<string, number>();
  for (const o of data) counts.set(o.status, (counts.get(o.status) ?? 0) + 1);

  const q = query.trim().toLowerCase();
  const rows = data.filter(
    (o) =>
      (active === "all" || o.status === active) &&
      (!q ||
        o.full_name.toLowerCase().includes(q) ||
        o.phone.replace(/\s+/g, "").includes(q.replace(/\s+/g, "")) ||
        o.city.toLowerCase().includes(q) ||
        o.id.toLowerCase().startsWith(q.replace(/^#/, "")))
  );

  const tabs: { key: OrderStatus | "all"; label: string; count: number }[] = [
    { key: "all", label: "All", count: data.length },
    ...ORDER_STATUSES.map((s) => ({ key: s, label: STATUS_LABEL[s], count: counts.get(s) ?? 0 })),
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStatus(t.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active === t.key
                ? "border-accent bg-accent/12 text-accent"
                : "border-line bg-surface text-muted hover:text-fg"
            )}
          >
            {t.label} <span className="tabular-nums opacity-70">{t.count}</span>
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, phone, city or #id"
            className="pl-9"
            aria-label="Search orders"
          />
        </div>
      </div>

      <Card className="overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState>No orders match.</EmptyState>
        ) : (
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 text-right font-medium">Items</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <Link href={`/orders/${o.id}`} className="font-medium hover:text-accent">
                      #{shortId(o.id)}
                    </Link>
                    <div className="text-xs text-muted">{dateTime(o.created_at)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{o.full_name}</div>
                    <div className="text-xs text-muted" dir="ltr">
                      {o.phone}
                    </div>
                  </td>
                  <td className="px-4 py-3">{o.city}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {o.order_items.reduce((n, i) => n + i.quantity, 0)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {money(o.total, o.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

export default function OrdersPage() {
  return (
    <>
      <PageHeader title="Orders" subtitle="Cash-on-delivery requests from the storefront." />
      <Suspense fallback={<Spinner />}>
        <OrdersView />
      </Suspense>
    </>
  );
}
