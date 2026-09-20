"use client";

import Link from "next/link";
import type { OrderStatus } from "@tcg/types";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { CURRENCY, dateTime, money, shortId } from "@/lib/format";
import { Card, EmptyState, Notice, PageHeader, Spinner, StatusBadge } from "@/components/ui";

interface OrderRow {
  id: string;
  status: OrderStatus;
  full_name: string;
  city: string;
  total: number | string;
  currency: string;
  created_at: string;
}

interface ProductRow {
  id: string;
  name_en: string;
  franchise_slug: string;
  stock: number;
  price: number | string;
}

const LOW_STOCK = 3;

async function loadOverview() {
  const supabase = getSupabase();
  const [orders, products] = await Promise.all([
    supabase
      .from("orders")
      .select("id,status,full_name,city,total,currency,created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("products").select("id,name_en,franchise_slug,stock,price"),
  ]);
  if (orders.error) throw orders.error;
  if (products.error) throw products.error;
  return {
    orders: (orders.data ?? []) as OrderRow[],
    products: (products.data ?? []) as ProductRow[],
  };
}

function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const body = (
    <Card className="p-4 transition-colors hover:bg-surface-2">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function OverviewPage() {
  const { data, error, loading } = useQuery(loadOverview, []);

  if (!data) {
    return (
      <>
        <PageHeader title="Overview" />
        {error ? <Notice>{error}</Notice> : <Spinner />}
      </>
    );
  }

  const { orders, products } = data;
  const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length;
  const sum = (rows: OrderRow[]) => rows.reduce((t, o) => t + Number(o.total), 0);
  // Money totals only cover IQD orders — leftover USD test orders would skew them.
  const iqd = orders.filter((o) => o.currency === CURRENCY);
  const delivered = iqd.filter((o) => o.status === "delivered");
  const inProgress = iqd.filter((o) => o.status === "confirmed" || o.status === "shipped");
  const lowStock = products
    .filter((p) => p.stock <= LOW_STOCK)
    .sort((a, b) => a.stock - b.stock);
  const outOfStock = products.filter((p) => p.stock === 0).length;

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={loading ? "Refreshing…" : "Cash on delivery — confirm each request by phone."}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="New requests"
          value={count("requested")}
          hint="Waiting for your call"
          href="/orders?status=requested"
        />
        <Stat
          label="In progress"
          value={inProgress.length}
          hint={money(sum(inProgress))}
          href="/orders?status=confirmed"
        />
        <Stat
          label="Delivered"
          value={delivered.length}
          hint={`${money(sum(delivered))} collected`}
          href="/orders?status=delivered"
        />
        <Stat
          label="Products"
          value={products.length}
          hint={`${outOfStock} out of stock`}
          href="/products"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">Latest orders</h2>
            <Link href="/orders" className="text-xs text-accent hover:underline">
              View all
            </Link>
          </div>
          {orders.length === 0 ? (
            <EmptyState>No orders yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {orders.slice(0, 8).map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{o.full_name}</div>
                      <div className="truncate text-xs text-muted">
                        #{shortId(o.id)} · {o.city} · {dateTime(o.created_at)}
                      </div>
                    </div>
                    <div className="text-sm tabular-nums">{money(o.total, o.currency)}</div>
                    <StatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">Low stock</h2>
            <span className="text-xs text-muted">≤ {LOW_STOCK} left</span>
          </div>
          {lowStock.length === 0 ? (
            <EmptyState>Everything is well stocked.</EmptyState>
          ) : (
            <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto">
              {lowStock.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/products/${encodeURIComponent(p.id)}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{p.name_en}</div>
                      <div className="text-xs text-muted">{p.franchise_slug}</div>
                    </div>
                    <span
                      className={
                        p.stock === 0
                          ? "text-sm font-semibold text-danger"
                          : "text-sm font-semibold text-warn"
                      }
                    >
                      {p.stock === 0 ? "Out" : p.stock}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
