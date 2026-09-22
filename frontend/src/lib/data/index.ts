import type {
  Franchise,
  FranchiseSlug,
  Product,
  ProductFilters,
  ProductListResult,
  ProductType,
  Rarity,
} from "@tcg/types";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Locale } from "@/i18n/routing";

/**
 * Single entry point every component/page uses to read product data.
 * Backed by Supabase (see src/lib/supabase/schema.sql) — every table row
 * carries English, Arabic and Sorani Kurdish text, resolved to the current
 * locale here so components never touch translation logic themselves.
 */

type FranchiseRow = {
  slug: string;
  name_en: string;
  name_ar: string;
  name_ckb: string;
  accent: string;
  badge_en: string;
  badge_ar: string;
  badge_ckb: string;
  description_en: string;
  description_ar: string;
  description_ckb: string;
  image: string;
  sort_order: number;
};

type ProductRow = {
  id: string;
  slug: string;
  franchise_slug: string;
  product_type: ProductType;
  name_en: string;
  name_ar: string;
  name_ckb: string;
  description_en: string;
  description_ar: string;
  description_ckb: string;
  set_name: string;
  card_number: string | null;
  rarity: Rarity | null;
  price: number | string;
  condition: string;
  grade: string | null;
  image: string;
  images: string[] | null;
  stock: number;
  created_at: string;
};

function pick(row: Record<string, unknown>, field: string, locale: Locale): string {
  const key = `${field}_${locale}`;
  return (row[key] as string) ?? (row[`${field}_en`] as string) ?? "";
}

function mapFranchiseRow(
  row: FranchiseRow,
  locale: Locale,
  agg: { cardCount: number; setCount: number; fromPrice: number }
): Franchise {
  return {
    slug: row.slug as FranchiseSlug,
    name: pick(row, "name", locale),
    accent: row.accent,
    badge: pick(row, "badge", locale),
    description: pick(row, "description", locale),
    image: row.image,
    cardCount: agg.cardCount,
    setCount: agg.setCount,
    fromPrice: agg.fromPrice,
  };
}

function mapProductRow(row: ProductRow, locale: Locale): Product {
  return {
    id: row.id,
    slug: row.slug,
    franchise: row.franchise_slug as FranchiseSlug,
    type: row.product_type,
    name: pick(row, "name", locale),
    set: row.set_name,
    cardNumber: row.card_number,
    rarity: row.rarity,
    price: Number(row.price),
    condition: row.condition,
    grade: row.grade,
    image: row.image,
    images: row.images ?? [],
    description: pick(row, "description", locale),
    stock: row.stock,
    createdAt: row.created_at,
  };
}

const RARITY_RANK: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  holo: 3,
  ultra: 4,
  promo: 5,
  secret: 6,
};

async function fetchAllProducts(): Promise<ProductRow[]> {
  const supabase = getSupabaseClient();
  // Storefront sells sealed packs/boxes only for now — single cards stay in
  // the database (a future card marketplace may use them) but are hidden
  // from every customer-facing listing.
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .neq("product_type", "single_card");
  if (error) throw error;
  return (data ?? []) as ProductRow[];
}

function aggregateFranchise(rows: ProductRow[]) {
  const sets = new Set(rows.map((p) => p.set_name));
  const fromPrice = rows.length ? Math.min(...rows.map((p) => Number(p.price))) : 0;
  return { cardCount: rows.length, setCount: sets.size, fromPrice };
}

export async function getFranchises(locale: Locale = "en"): Promise<Franchise[]> {
  const supabase = getSupabaseClient();
  const [{ data: franchiseRows, error: fErr }, products] = await Promise.all([
    supabase.from("franchises").select("*").order("sort_order"),
    fetchAllProducts(),
  ]);
  if (fErr) throw fErr;

  return ((franchiseRows ?? []) as FranchiseRow[]).map((row) => {
    const rows = products.filter((p) => p.franchise_slug === row.slug);
    return mapFranchiseRow(row, locale, aggregateFranchise(rows));
  });
}

export async function getFranchise(
  slug: FranchiseSlug,
  locale: Locale = "en"
): Promise<Franchise | null> {
  const supabase = getSupabaseClient();
  const [{ data: row, error }, products] = await Promise.all([
    supabase.from("franchises").select("*").eq("slug", slug).maybeSingle(),
    fetchAllProducts(),
  ]);
  if (error) throw error;
  if (!row) return null;

  const rows = products.filter((p) => p.franchise_slug === slug);
  return mapFranchiseRow(row as FranchiseRow, locale, aggregateFranchise(rows));
}

function applyFilters(products: Product[], filters: ProductFilters): Product[] {
  let result = products;
  if (filters.rarity?.length) {
    result = result.filter((p) => p.rarity && filters.rarity!.includes(p.rarity));
  }
  if (filters.minPrice != null) {
    result = result.filter((p) => p.price >= filters.minPrice!);
  }
  if (filters.maxPrice != null) {
    result = result.filter((p) => p.price <= filters.maxPrice!);
  }
  if (filters.set) {
    result = result.filter((p) => p.set === filters.set);
  }
  if (filters.query) {
    const q = filters.query.trim().toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.set.toLowerCase().includes(q) ||
        p.franchise.toLowerCase().includes(q)
    );
  }

  const sort = filters.sort ?? "newest";
  result = [...result].sort((a, b) => {
    switch (sort) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "rarity":
        return (RARITY_RANK[b.rarity ?? ""] ?? -1) - (RARITY_RANK[a.rarity ?? ""] ?? -1);
      case "newest":
      default:
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    }
  });

  return result;
}

export async function getProducts(
  franchise: FranchiseSlug | FranchiseSlug[] | undefined,
  filters: ProductFilters = {},
  locale: Locale = "en"
): Promise<ProductListResult> {
  // No franchise = every franchise, including ones added from the dashboard.
  const slugs = franchise ? (Array.isArray(franchise) ? franchise : [franchise]) : null;

  const rows = await fetchAllProducts();
  const all = rows
    .filter((p) => !slugs || slugs.includes(p.franchise_slug))
    .map((p) => mapProductRow(p, locale));

  const filtered = applyFilters(all, filters);

  const pageSize = filters.pageSize ?? 24;
  const page = filters.page ?? 1;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);
  const sets = Array.from(new Set(all.map((p) => p.set))).sort();

  return { items, total: filtered.length, page, pageSize, sets };
}

export async function getFeaturedProducts(limit = 8, locale: Locale = "en"): Promise<Product[]> {
  const { items } = await getProducts(undefined, { sort: "rarity", pageSize: 200 }, locale);
  // Spread featured picks across franchises rather than letting one
  // franchise's high rarities dominate the carousel.
  const seen = new Set<FranchiseSlug>();
  const franchiseCount = new Set(items.map((p) => p.franchise)).size;
  const picks: Product[] = [];
  for (const item of items) {
    if (picks.length >= limit) break;
    if (seen.has(item.franchise) && seen.size < franchiseCount) continue;
    seen.add(item.franchise);
    picks.push(item);
  }
  for (const item of items) {
    if (picks.length >= limit) break;
    if (!picks.includes(item)) picks.push(item);
  }
  return picks.slice(0, limit);
}

export async function getProductBySlug(
  franchise: FranchiseSlug,
  slug: string,
  locale: Locale = "en"
): Promise<Product | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("franchise_slug", franchise)
    .eq("slug", slug)
    .neq("product_type", "single_card")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProductRow(data as ProductRow, locale);
}

export async function getRelatedProducts(
  product: Product,
  limit = 4,
  locale: Locale = "en"
): Promise<Product[]> {
  const { items } = await getProducts(product.franchise, { pageSize: 200 }, locale);
  const sameSet = items.filter((p) => p.id !== product.id && p.set === product.set);
  const rest = items.filter((p) => p.id !== product.id && p.set !== product.set);
  return [...sameSet, ...rest].slice(0, limit);
}

export interface SiteSettings {
  currency: string;
  whatsappNumber: string | null;
  contactEmail: string | null;
}

export async function getSettings(): Promise<SiteSettings> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("settings")
    .select("currency, whatsapp_number, contact_email")
    .eq("id", true)
    .maybeSingle();
  if (error || !data) return { currency: "IQD", whatsappNumber: null, contactEmail: null };
  return {
    currency: data.currency as string,
    whatsappNumber: (data.whatsapp_number as string) ?? null,
    contactEmail: (data.contact_email as string) ?? null,
  };
}
