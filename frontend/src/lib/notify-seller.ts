import "server-only";
import { cityName } from "@/lib/iraq-cities";
import { formatPrice } from "@/lib/utils";
import { toInternational, type ContactChannel } from "@/lib/market";
import type { Locale } from "@/i18n/routing";

/**
 * Tells a seller they have a new marketplace order — on WhatsApp, or on
 * Viber when that's the channel they picked (no WhatsApp) or WhatsApp
 * can't deliver to their number.
 *
 * WhatsApp: Meta's WhatsApp Business Cloud API. A business may only start a
 * conversation with a pre-approved *template*, so create one named
 * WHATSAPP_ORDER_TEMPLATE (default `new_market_order`) with 8 body
 * variables, in order: title, quantity, total, buyer name, buyer phone,
 * city, address, order link. Env: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
 * optional WHATSAPP_TEMPLATE_LANG (default `ar` — WhatsApp templates have no
 * Sorani, Arabic script reads best for Kurdish sellers).
 *
 * WhatsApp accepts a send before it knows whether the number has WhatsApp;
 * an unreachable number comes back later as a `failed` status on the
 * webhook (app/api/whatsapp/webhook), which then calls `sendViber` here.
 *
 * Viber: Viber Business Messages through Infobip (Viber has no public
 * send-by-phone API of its own). Env: INFOBIP_BASE_URL, INFOBIP_API_KEY,
 * INFOBIP_VIBER_SENDER.
 *
 * With neither configured nothing is sent (`skipped`) — the order still
 * shows in the seller's Sell → Orders tab, and the buyer gets one-tap
 * WhatsApp/Viber buttons to message the seller themselves.
 */

export type OrderNotice = {
  orderId: string;
  sellerPhone: string;
  sellerLocale: Locale;
  listingTitle: string;
  quantity: number;
  total: number;
  buyerName: string;
  buyerPhone: string;
  buyerCity: string;
  buyerAddress: string;
  notes: string | null;
};

export type NotifyResult = {
  channel: ContactChannel | null;
  status: "sent" | "failed" | "skipped";
  ref?: string;
  error?: string;
};

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function sellerOrdersUrl(locale: Locale) {
  return `${siteUrl()}/${locale}/sell?tab=orders`;
}

const COPY: Record<Locale, { title: string; qty: string; total: string; buyer: string; phone: string; city: string; address: string; notes: string; open: string }> = {
  en: { title: "🛒 New KurdishTCG order", qty: "Qty", total: "Total (cash on delivery)", buyer: "Buyer", phone: "Phone", city: "City", address: "Address", notes: "Notes", open: "Manage the order" },
  ar: { title: "🛒 طلب جديد على KurdishTCG", qty: "الكمية", total: "المجموع (الدفع عند الاستلام)", buyer: "المشتري", phone: "الهاتف", city: "المدينة", address: "العنوان", notes: "ملاحظات", open: "إدارة الطلب" },
  ckb: { title: "🛒 داواکارییەکی نوێ لە KurdishTCG", qty: "ژمارە", total: "کۆی گشتی (پارەدان لە کاتی گەیاندن)", buyer: "کڕیار", phone: "مۆبایل", city: "شار", address: "ناونیشان", notes: "تێبینی", open: "بەڕێوەبردنی داواکاری" },
};

/** Plain-text order summary — the Viber message and the buyer's "message seller" draft. */
export function orderMessage(n: OrderNotice): string {
  const c = COPY[n.sellerLocale];
  return [
    c.title,
    `${n.listingTitle} × ${n.quantity}`,
    `${c.total}: ${formatPrice(n.total, n.sellerLocale)}`,
    `${c.buyer}: ${n.buyerName}`,
    `${c.phone}: ${n.buyerPhone}`,
    `${c.city}: ${cityName(n.buyerCity, n.sellerLocale)}`,
    `${c.address}: ${n.buyerAddress}`,
    n.notes ? `${c.notes}: ${n.notes}` : null,
    `${c.open}: ${sellerOrdersUrl(n.sellerLocale)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export function viberConfigured() {
  return Boolean(process.env.INFOBIP_BASE_URL && process.env.INFOBIP_API_KEY && process.env.INFOBIP_VIBER_SENDER);
}

async function sendWhatsApp(n: OrderNotice): Promise<NotifyResult> {
  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  const text = (s: string) => ({ type: "text", text: s.slice(0, 900) || "-" });
  try {
    const res = await fetch(
      `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toInternational(n.sellerPhone),
          type: "template",
          template: {
            name: process.env.WHATSAPP_ORDER_TEMPLATE ?? "new_market_order",
            language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "ar" },
            components: [
              {
                type: "body",
                parameters: [
                  text(n.listingTitle),
                  text(String(n.quantity)),
                  text(formatPrice(n.total, "en")),
                  text(n.buyerName),
                  text(n.buyerPhone),
                  text(cityName(n.buyerCity, n.sellerLocale)),
                  text(n.buyerAddress),
                  text(sellerOrdersUrl(n.sellerLocale)),
                ],
              },
            ],
          },
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { channel: "whatsapp", status: "failed", error: data?.error?.message ?? `http_${res.status}` };
    }
    return { channel: "whatsapp", status: "sent", ref: data?.messages?.[0]?.id };
  } catch (e) {
    return { channel: "whatsapp", status: "failed", error: e instanceof Error ? e.message : "network" };
  }
}

export async function sendViber(n: OrderNotice): Promise<NotifyResult> {
  if (!viberConfigured()) return { channel: "viber", status: "skipped" };
  try {
    const res = await fetch(`${process.env.INFOBIP_BASE_URL!.replace(/\/$/, "")}/viber/2/messages`, {
      method: "POST",
      headers: {
        Authorization: `App ${process.env.INFOBIP_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            sender: process.env.INFOBIP_VIBER_SENDER,
            destinations: [{ to: toInternational(n.sellerPhone) }],
            content: { type: "TEXT", text: orderMessage(n) },
          },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { channel: "viber", status: "failed", error: data?.requestError?.serviceException?.text ?? `http_${res.status}` };
    }
    return { channel: "viber", status: "sent", ref: data?.messages?.[0]?.messageId };
  } catch (e) {
    return { channel: "viber", status: "failed", error: e instanceof Error ? e.message : "network" };
  }
}

export async function notifySeller(n: OrderNotice, channel: ContactChannel): Promise<NotifyResult> {
  if (channel === "viber") return sendViber(n);
  if (!whatsappConfigured()) {
    // No WhatsApp integration yet: Viber is still better than nothing.
    return viberConfigured() ? sendViber(n) : { channel: null, status: "skipped" };
  }
  const wa = await sendWhatsApp(n);
  if (wa.status === "sent") return wa;
  // Rejected outright (bad number, template problem…) — fall back now.
  const vb = await sendViber(n);
  return vb.status === "skipped" ? wa : vb;
}
