import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyUser } from "@/lib/supabase/verify-user";
import { rateLimit } from "@/lib/rate-limit";
import { deletePublicImages } from "@/lib/r2";
import {
  LISTING_COLUMNS,
  LISTING_PREFIX,
  cleanupFinishedListings,
  deleteListing,
  hasOpenOrderLines,
  listingColumns,
  parseListing,
  revalidateStorefront,
} from "@/lib/listings";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function loadOwned(request: Request, id: string) {
  const user = await verifyUser(request);
  if (!user) return { error: NextResponse.json({ error: "auth_required" }, { status: 401 }) };
  const admin = getSupabaseAdmin();
  const { data: listing } = await admin
    .from("products")
    .select("id, seller_id, image, images, stock")
    .eq("id", id)
    .maybeSingle();
  // Same answer for "not yours" and "doesn't exist".
  if (!listing || listing.seller_id !== user.id) {
    return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  }
  return { user, admin, listing };
}

/** Edit a listing (price, quantity, photos, details). */
export async function PATCH(request: Request, { params }: Ctx) {
  const limited = rateLimit(request, "seller-listing", 30, 60_000);
  if (limited) return limited;
  const { id } = await params;
  const owned = await loadOwned(request, id);
  if ("error" in owned) return owned.error;
  const { user, admin, listing } = owned;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  const parsed = parseListing(body, user.id);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data: franchise } = await admin
    .from("franchises")
    .select("slug")
    .eq("slug", parsed.value.franchise)
    .maybeSingle();
  if (!franchise) return NextResponse.json({ error: "bad_franchise" }, { status: 400 });

  // Compare-and-set on stock: a checkout may have taken units since the form
  // was opened. The client sends the stock it saw; if it changed, refuse.
  const seenStock = Number(body.seenStock);
  let query = admin.from("products").update(listingColumns(parsed.value)).eq("id", id);
  if (Number.isInteger(seenStock)) query = query.eq("stock", seenStock);
  const { data, error } = await query.select(LISTING_COLUMNS);
  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "stock_changed" }, { status: 409 });

  // Photos removed in the edit are deleted from storage.
  const kept = new Set(parsed.value.images);
  const dropped = [listing.image, ...(listing.images ?? [])].filter((u) => u && !kept.has(u));
  if (dropped.length) await deletePublicImages(dropped, `${LISTING_PREFIX}${user.id}/`);

  revalidateStorefront();
  // Setting quantity to 0 on an already-completed listing removes it.
  if (parsed.value.stock === 0 && (await cleanupFinishedListings(admin, [id])) > 0) {
    return NextResponse.json({ listing: null, removed: true });
  }
  return NextResponse.json({ listing: data[0] });
}

/** Delete a listing — refused while an order for it is still in progress. */
export async function DELETE(request: Request, { params }: Ctx) {
  const limited = rateLimit(request, "seller-listing", 30, 60_000);
  if (limited) return limited;
  const { id } = await params;
  const owned = await loadOwned(request, id);
  if ("error" in owned) return owned.error;
  const { admin, listing } = owned;

  if (await hasOpenOrderLines(admin, id)) {
    return NextResponse.json({ error: "has_open_orders" }, { status: 409 });
  }
  try {
    await deleteListing(admin, listing);
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  revalidateStorefront();
  return NextResponse.json({ ok: true });
}
