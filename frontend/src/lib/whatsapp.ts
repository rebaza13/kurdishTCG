import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Tells each seller on an order, over WhatsApp, who wants their cards.
 *
 * Uses the WhatsApp Business Cloud API (Meta). A no-op until these are set in
 * frontend/.env.local / the Vercel env, and never throws — a notification
 * failing must not fail the customer's order:
 *
 *   WHATSAPP_TOKEN            permanent access token (System User)
 *   WHATSAPP_PHONE_NUMBER_ID  the sending number's id (WhatsApp → API Setup)
 *   WHATSAPP_TEMPLATE_NAME    an APPROVED template (default: new_seller_order)
 *   WHATSAPP_TEMPLATE_LANG    its language code (default: en)
 *
 * WhatsApp only lets a business message someone first through an approved
 * template. Create one (Utility category) whose body has 5 variables, e.g.:
 *
 *   New order {{1}} on KurdishTCG for: {{2}}.
 *   Buyer: {{3}}, phone {{4}}, {{5}}.
 *   Contact the buyer to arrange delivery and payment, then mark the
 *   payment as received in your Sell page.
 *
 * Even without this configured, sellers see every order (with a one-tap
 * WhatsApp chat link to the buyer) on /sell, and buyers get a WhatsApp link
 * to the seller on their order page.
 */

/** 07xxxxxxxxx → 9647xxxxxxxxx (the international form WhatsApp wants). */
export function toWhatsAppNumber(local: string): string {
  return local.startsWith("0") ? `964${local.slice(1)}` : local.replace(/^\+/, "");
}

/** Template variables can't contain newlines/tabs or 4+ spaces in a row. */
const clean = (s: string, max = 200) =>
  s.replace(/[\n\r\t]+/g, " ").replace(/ {4,}/g, "   ").trim().slice(0, max) || "-";

async function sendTemplate(to: string, params: string[]): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return;

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE_NAME || "new_seller_order",
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
        components: [
          { type: "body", parameters: params.map((text) => ({ type: "text", text })) },
        ],
      },
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) console.error("[whatsapp] send failed:", res.status, await res.text());
}

export async function notifySellersOfOrder(orderId: string): Promise<void> {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) return;

  try {
    const admin = getSupabaseAdmin();
    const [{ data: order }, { data: items }] = await Promise.all([
      admin.from("orders").select("full_name, phone, city, address").eq("id", orderId).maybeSingle(),
      admin
        .from("order_items")
        .select("seller_id, seller_whatsapp, product_name, quantity")
        .eq("order_id", orderId)
        .not("seller_id", "is", null),
    ]);
    if (!order || !items?.length) return;

    const bySeller = new Map<string, { to: string; lines: string[] }>();
    for (const item of items) {
      if (!item.seller_whatsapp) continue;
      const entry = bySeller.get(item.seller_id) ?? { to: toWhatsAppNumber(item.seller_whatsapp), lines: [] };
      entry.lines.push(`${item.quantity} x ${item.product_name}`);
      bySeller.set(item.seller_id, entry);
    }

    const ref = `#${orderId.slice(0, 8).toUpperCase()}`;
    await Promise.all(
      [...bySeller.values()].map(({ to, lines }) =>
        sendTemplate(to, [
          ref,
          clean(lines.join(", "), 500),
          clean(order.full_name),
          order.phone,
          clean(`${order.city}, ${order.address}`, 300),
        ]).catch((err) => console.error("[whatsapp] notify failed:", err))
      )
    );
  } catch (err) {
    console.error("[whatsapp] notify failed:", err);
  }
}
