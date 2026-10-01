import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * New-order push to the shop owner's phone via a Telegram bot. A no-op until
 * TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set, and never throws — a
 * notification failing must not fail (or roll back) the customer's order.
 *
 *   1. Message @BotFather → /newbot → copy the token.
 *   2. Message your new bot once, then open
 *      https://api.telegram.org/bot<TOKEN>/getUpdates and copy `chat.id`.
 *   3. Put both in frontend/.env.local (and the Vercel project env).
 */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const iqd = (n: number) => `${Math.round(n).toLocaleString("en-US")} IQD`;

export async function notifyNewOrder(orderId: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const admin = getSupabaseAdmin();
    const { data: order } = await admin
      .from("orders")
      .select("id, full_name, phone, city, address, notes, total, payment_method, payment_status")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;
    const { data: items } = await admin
      .from("order_items")
      .select("product_name, quantity")
      .eq("order_id", orderId);

    const dashboard = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";
    const paid = order.payment_method === "fib" && order.payment_status === "paid";
    const lines = [
      `🛒 <b>New order #${orderId.slice(0, 8).toUpperCase()}</b>`,
      paid ? "💳 Paid with FIB" : "💵 Cash on delivery",
      "",
      `👤 ${esc(order.full_name)} — ${esc(order.phone)}`,
      `📍 ${esc(order.city)}, ${esc(order.address)}`,
      ...(order.notes ? [`📝 ${esc(order.notes)}`] : []),
      "",
      ...(items ?? []).map((i) => `• ${i.quantity} × ${esc(i.product_name)}`),
      "",
      `<b>Total: ${iqd(Number(order.total))}</b>`,
      `${dashboard}/orders/${orderId}`,
    ];

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join("\n"),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) console.error("[telegram] sendMessage failed:", res.status, await res.text());
  } catch (err) {
    console.error("[telegram] notify failed:", err);
  }
}
