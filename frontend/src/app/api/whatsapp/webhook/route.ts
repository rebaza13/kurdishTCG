import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendViber } from "@/lib/notify-seller";
import { locales, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * WhatsApp Cloud API webhook (Meta App → WhatsApp → Configuration).
 * Callback URL: {SITE}/api/whatsapp/webhook, verify token:
 * WHATSAPP_VERIFY_TOKEN. Subscribe to the `messages` field.
 *
 * We only care about delivery statuses of seller order notifications: when
 * WhatsApp reports one `failed` because the number can't receive WhatsApp
 * messages, the seller gets the same order on Viber instead.
 */

// Error codes meaning "this number can't get WhatsApp messages from us".
// 131026 = message undeliverable (not on WhatsApp / old app / not accepted
// terms); 131049/131050 = recipient-side delivery restrictions.
const UNREACHABLE = new Set([131026, 131049, 131050]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (
    token &&
    url.searchParams.get("hub.mode") === "subscribe" &&
    url.searchParams.get("hub.verify_token") === token
  ) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

function validSignature(raw: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
  const given = Buffer.from(header.slice(7));
  return expected.length === given.length && timingSafeEqual(expected, given);
}

type StatusEvent = { id: string; status: string; errors?: { code: number; title?: string }[] };

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"))) {
    return new Response("invalid signature", { status: 401 });
  }

  let payload: { entry?: { changes?: { value?: { statuses?: StatusEvent[] } }[] }[] };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const statuses = (payload.entry ?? []).flatMap((e) =>
    (e.changes ?? []).flatMap((c) => c.value?.statuses ?? [])
  );
  const db = getSupabaseAdmin();

  for (const s of statuses) {
    if (s.status !== "failed") continue;
    const code = s.errors?.[0]?.code;

    const { data: order } = await db
      .from("listing_orders")
      .select("*")
      .eq("notify_ref", s.id)
      .eq("notify_channel", "whatsapp")
      .maybeSingle();
    if (!order) continue;

    if (code == null || !UNREACHABLE.has(code)) {
      await db
        .from("listing_orders")
        .update({ notify_status: "failed", notify_error: s.errors?.[0]?.title ?? "failed" })
        .eq("id", order.id);
      continue;
    }

    const { data: seller } = await db
      .from("seller_profiles")
      .select("locale")
      .eq("user_id", order.seller_id)
      .maybeSingle();
    const sellerLocale: Locale = locales.includes(seller?.locale as Locale) ? (seller!.locale as Locale) : "ckb";

    const vb = await sendViber({
      orderId: order.id,
      sellerPhone: order.seller_phone,
      sellerLocale,
      listingTitle: order.listing_title,
      quantity: order.quantity,
      total: Number(order.total),
      buyerName: order.buyer_name,
      buyerPhone: order.buyer_phone,
      buyerCity: order.buyer_city,
      buyerAddress: order.buyer_address,
      notes: order.notes,
    });
    await db
      .from("listing_orders")
      .update({
        notify_channel: vb.status === "skipped" ? "whatsapp" : "viber",
        notify_status: vb.status === "sent" ? "sent" : "failed",
        notify_ref: vb.ref ?? order.notify_ref,
        notify_error: vb.status === "sent" ? null : vb.error ?? `whatsapp_${code}`,
        notified_at: vb.status === "sent" ? new Date().toISOString() : order.notified_at,
      })
      .eq("id", order.id);
  }

  // Always 200 so Meta doesn't retry events we've handled (or ignore).
  return NextResponse.json({ ok: true });
}
