import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyUser } from "@/lib/supabase/verify-user";
import { normalizeIraqiMobile } from "@/lib/phone";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function displayName(user: User, profileName: string | null): string {
  const meta = user.user_metadata ?? {};
  return (profileName || meta.full_name || meta.name || user.email?.split("@")[0] || "Seller").slice(0, 80);
}

/** The signed-in seller's WhatsApp number + display name. */
export async function GET(request: Request) {
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const { data } = await getSupabaseAdmin()
    .from("profiles")
    .select("full_name, whatsapp")
    .eq("id", user.id)
    .maybeSingle();
  return NextResponse.json({
    name: displayName(user, data?.full_name ?? null),
    whatsapp: data?.whatsapp ?? null,
  });
}

/** Save the seller's WhatsApp number (an Iraqi mobile). */
export async function POST(request: Request) {
  const limited = rateLimit(request, "seller-profile", 20, 60_000);
  if (limited) return limited;
  const user = await verifyUser(request);
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { whatsapp?: string } | null;
  const whatsapp = normalizeIraqiMobile(body?.whatsapp ?? "");
  if (!whatsapp) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

  const admin = getSupabaseAdmin();
  // The signup trigger normally creates the row; upsert covers older accounts.
  const { error } = await admin
    .from("profiles")
    .upsert({ id: user.id, whatsapp }, { onConflict: "id" });
  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });

  // Keep the contact number on the seller's open order lines current too.
  await admin
    .from("order_items")
    .update({ seller_whatsapp: whatsapp })
    .eq("seller_id", user.id)
    .is("buyer_received_at", null);

  return NextResponse.json({ whatsapp });
}
