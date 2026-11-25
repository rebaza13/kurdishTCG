import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyUser } from "@/lib/supabase/verify-user";
import { rateLimit } from "@/lib/rate-limit";
import {
  LISTING_COLUMNS,
  listingColumns,
  parseListing,
  revalidateStorefront,
} from "@/lib/listings";

export const dynamic = "force-dynamic";

/** The signed-in seller's own listings. */
export async function GET(request: Request) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .select(LISTING_COLUMNS)
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });
  return NextResponse.json({ listings: data ?? [] });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Create a listing. Needs a WhatsApp number on the profile first. */
export async function POST(request: Request) {
  const limited = rateLimit(request, "seller-listing", 20, 60_000);
  if (limited) return limited;
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  const parsed = parseListing(body, user.id);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const admin = getSupabaseAdmin();
  const [{ data: profile }, { data: franchise }, { count }] = await Promise.all([
    admin.from("profiles").select("full_name, whatsapp").eq("id", user.id).maybeSingle(),
    admin.from("franchises").select("slug").eq("slug", parsed.value.franchise).maybeSingle(),
    admin.from("products").select("id", { count: "exact", head: true }).eq("seller_id", user.id),
  ]);
  if (!profile?.whatsapp) return NextResponse.json({ error: "whatsapp_required" }, { status: 400 });
  if (!franchise) return NextResponse.json({ error: "bad_franchise" }, { status: 400 });
  if ((count ?? 0) >= 200) return NextResponse.json({ error: "too_many_listings" }, { status: 400 });

  const meta = user.user_metadata ?? {};
  const sellerName = String(
    profile.full_name || meta.full_name || meta.name || user.email?.split("@")[0] || "Seller"
  ).slice(0, 80);

  // Arabic / Kurdish names slugify to nothing — fall back to the product type.
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const base = slugify(parsed.value.name) || parsed.value.type.replace(/_/g, "-");
  const row = {
    id: `listing-${suffix}`,
    slug: `${base}-${suffix}`,
    seller_id: user.id,
    seller_name: sellerName,
    ...listingColumns(parsed.value),
  };

  const { data, error } = await admin.from("products").insert(row).select(LISTING_COLUMNS).single();
  if (error) {
    console.error("[seller/listings] insert failed:", error.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  revalidateStorefront();
  return NextResponse.json({ listing: data });
}
