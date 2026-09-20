"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import type { ProductType } from "@tcg/types";
import { assertWritten, errorMessage, getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { PRODUCT_TYPES, PRODUCT_TYPE_LABEL, money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Thumb } from "@/components/image-upload";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Notice,
  PageHeader,
  Select,
  Spinner,
} from "@/components/ui";

interface ProductRow {
  id: string;
  franchise_slug: string;
  product_type: ProductType;
  name_en: string;
  set_name: string;
  price: number | string;
  stock: number;
  image: string;
}

async function loadProducts() {
  const supabase = getSupabase();
  const [products, franchises] = await Promise.all([
    supabase
      .from("products")
      .select("id,franchise_slug,product_type,name_en,set_name,price,stock,image")
      .order("created_at", { ascending: false }),
    supabase.from("franchises").select("slug,name_en").order("sort_order"),
  ]);
  if (products.error) throw products.error;
  if (franchises.error) throw franchises.error;
  return {
    products: (products.data ?? []) as ProductRow[],
    franchises: (franchises.data ?? []) as { slug: string; name_en: string }[],
  };
}

/** Stock cell that saves itself on blur / Enter. */
function StockCell({ product, onSaved }: { product: ProductRow; onSaved: () => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function commit() {
    if (draft === null) return;
    const next = Number(draft);
    if (!Number.isInteger(next) || next < 0) {
      setState("error");
      setMessage("Whole number ≥ 0");
      return;
    }
    if (next === product.stock) {
      setDraft(null);
      return;
    }
    setState("saving");
    try {
      const { data, error } = await getSupabase()
        .from("products")
        .update({ stock: next })
        .eq("id", product.id)
        .select("id");
      if (error) throw error;
      assertWritten(data, "The stock change");
      setDraft(null);
      setState("idle");
      setMessage(null);
      onSaved();
    } catch (err) {
      setState("error");
      setMessage(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col items-end">
      <input
        type="number"
        min={0}
        step={1}
        value={draft ?? String(product.stock)}
        disabled={state === "saving"}
        aria-label={`Stock for ${product.name_en}`}
        onChange={(e) => {
          setDraft(e.target.value);
          setState("idle");
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(null);
            setState("idle");
          }
        }}
        className={cn(
          "h-8 w-20 rounded-md border bg-surface px-2 text-right text-sm tabular-nums focus-visible:border-accent focus-visible:outline-none",
          state === "error" ? "border-danger" : "border-line",
          product.stock === 0 && draft === null && "text-danger"
        )}
      />
      {state === "error" && message && (
        <span className="mt-0.5 max-w-40 text-right text-xs text-danger">{message}</span>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const { data, error, reload } = useQuery(loadProducts, []);
  const [search, setSearch] = useState("");
  const [franchise, setFranchise] = useState("");
  const [type, setType] = useState("");
  const [stockFilter, setStockFilter] = useState<"" | "low" | "out">("");

  const header = (
    <PageHeader
      title="Products"
      subtitle="Cards, packs, boxes and decks in the storefront."
      actions={
        <Link href="/products/new">
          <Button variant="primary">
            <Plus className="size-4" /> New product
          </Button>
        </Link>
      }
    />
  );

  if (!data) {
    return (
      <>
        {header}
        {error ? <Notice>{error}</Notice> : <Spinner />}
      </>
    );
  }

  const q = search.trim().toLowerCase();
  const rows = data.products.filter(
    (p) =>
      (!franchise || p.franchise_slug === franchise) &&
      (!type || p.product_type === type) &&
      (stockFilter === "" ||
        (stockFilter === "out" ? p.stock === 0 : p.stock <= 3)) &&
      (!q ||
        p.name_en.toLowerCase().includes(q) ||
        p.set_name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q))
  );

  return (
    <>
      {header}

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, set or id"
            className="pl-9"
            aria-label="Search products"
          />
        </div>
        <Select value={franchise} onChange={(e) => setFranchise(e.target.value)} aria-label="Franchise">
          <option value="">All franchises</option>
          {data.franchises.map((f) => (
            <option key={f.slug} value={f.slug}>
              {f.name_en}
            </option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Product type">
          <option value="">All types</option>
          {PRODUCT_TYPES.map((t) => (
            <option key={t} value={t}>
              {PRODUCT_TYPE_LABEL[t]}
            </option>
          ))}
        </Select>
        <Select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as "" | "low" | "out")}
          aria-label="Stock level"
        >
          <option value="">Any stock</option>
          <option value="low">Low (≤ 3)</option>
          <option value="out">Out of stock</option>
        </Select>
      </div>

      <Card className="overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState>No products match.</EmptyState>
        ) : (
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Franchise</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-surface-2">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/products/${encodeURIComponent(p.id)}`}
                      className="flex items-center gap-3"
                    >
                      <Thumb src={p.image} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium hover:text-accent">
                          {p.name_en}
                        </span>
                        <span className="block truncate text-xs text-muted">{p.set_name}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{p.franchise_slug}</td>
                  <td className="px-4 py-2.5">
                    <Badge>{PRODUCT_TYPE_LABEL[p.product_type] ?? p.product_type}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(p.price)}</td>
                  <td className="px-4 py-2.5">
                    <StockCell product={p} onSaved={reload} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="mt-2 text-xs text-muted">
        {rows.length} of {data.products.length} products · edit stock inline, press Enter to save.
      </p>
    </>
  );
}
