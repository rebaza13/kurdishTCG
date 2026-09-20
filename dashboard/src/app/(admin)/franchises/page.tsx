"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { Thumb } from "@/components/image-upload";
import { Button, Card, EmptyState, Notice, PageHeader, Spinner } from "@/components/ui";

interface FranchiseRow {
  slug: string;
  name_en: string;
  badge_en: string;
  accent: string;
  image: string;
  sort_order: number;
}

async function loadFranchises() {
  const supabase = getSupabase();
  const [franchises, products] = await Promise.all([
    supabase.from("franchises").select("slug,name_en,badge_en,accent,image,sort_order").order("sort_order"),
    supabase.from("products").select("franchise_slug"),
  ]);
  if (franchises.error) throw franchises.error;
  if (products.error) throw products.error;

  const counts = new Map<string, number>();
  for (const p of products.data ?? []) {
    counts.set(p.franchise_slug, (counts.get(p.franchise_slug) ?? 0) + 1);
  }
  return {
    franchises: (franchises.data ?? []) as FranchiseRow[],
    counts,
  };
}

export default function FranchisesPage() {
  const { data, error } = useQuery(loadFranchises, []);

  return (
    <>
      <PageHeader
        title="Franchises"
        subtitle="Each franchise is a section of the storefront."
        actions={
          <Link href="/franchises/new">
            <Button variant="primary">
              <Plus className="size-4" /> New franchise
            </Button>
          </Link>
        }
      />
      {!data ? (
        error ? <Notice>{error}</Notice> : <Spinner />
      ) : data.franchises.length === 0 ? (
        <Card>
          <EmptyState>No franchises yet.</EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.franchises.map((f) => (
            <Link key={f.slug} href={`/franchises/${f.slug}`}>
              <Card className="flex items-center gap-4 overflow-hidden p-4 transition-colors hover:bg-surface-2">
                <Thumb src={f.image} className="size-16" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{f.name_en}</div>
                  <div className="truncate text-xs text-muted">{f.badge_en}</div>
                  <div className="mt-1 text-xs text-muted">
                    {data.counts.get(f.slug) ?? 0} products
                  </div>
                </div>
                <span
                  className="size-4 shrink-0 rounded-full border border-line"
                  style={{ background: f.accent }}
                  title={f.accent}
                />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
