import { after, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyUser } from "@/lib/supabase/verify-user";
import { normalizeIraqiMobile } from "@/lib/phone";
import { cancelFibPayment, createFibPayment, FibPayError } from "@/lib/fib";
import { notifyNewOrder } from "@/lib/telegram";
import { rateLimit } from "@/lib/rate-limit";
import { isGovernorate } from "@/lib/governorates";
import { locales, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface CheckoutItem {
  productId: string;
  quantity: number;
}

interface CheckoutBody {
  /**
   * Client-generated UUID, one per checkout attempt, used as the order's
   * primary key. Makes the endpoint idempotent without a schema change: a
   * double-click or a retried request after a dropped response hits the same
   * id and gets the already-created order back instead of a second order
   * (and, for FIB, a second payable QR code).
   */
  orderId?: string;
  locale?: string;
  fullName?: string;
  phone?: string;
  city?: string;
  address?: string;
  notes?: string | null;
  paymentMethod?: "cash" | "fib";
  items?: CheckoutItem[];
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_LEN = { fullName: 120, city: 80, address: 500, notes: 1000 } as const;

function pickName(row: { name_en: string; name_ar: string; name_ckb: string }, locale: Locale) {
  return row[`name_${locale}` as const] || row.name_en;
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "checkout", 10, 60_000);
  if (limited) return limited;

  let body: CheckoutBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const locale: Locale = locales.includes(body.locale as Locale) ? (body.locale as Locale) : "en";
  const fullName = (body.fullName ?? "").trim();
  const phone = normalizeIraqiMobile(body.phone ?? "");
  const city = (body.city ?? "").trim();
  const address = (body.address ?? "").trim();
  const notes = body.notes?.trim() || null;
  const paymentMethod = body.paymentMethod === "fib" ? "fib" : "cash";
  const rawItems = Array.isArray(body.items) ? body.items : [];

  if (!fullName || !city || !address) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!isGovernorate(city)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }
  if (
    fullName.length > MAX_LEN.fullName ||
    city.length > MAX_LEN.city ||
    address.length > MAX_LEN.address ||
    (notes?.length ?? 0) > MAX_LEN.notes
  ) {
    return NextResponse.json({ error: "field_too_long" }, { status: 400 });
  }
  if (
    rawItems.length === 0 ||
    rawItems.length > 50 ||
    rawItems.some(
      (i) =>
        !i ||
        typeof i.productId !== "string" ||
        !i.productId ||
        !Number.isInteger(i.quantity) ||
        i.quantity <= 0 ||
        i.quantity > 999
    )
  ) {
    return NextResponse.json({ error: "invalid_items" }, { status: 400 });
  }

  // Merge duplicate productIds (e.g. the same item submitted twice) so the
  // stock check below validates against total requested quantity, not each
  // line independently — otherwise two lines of 5 against a stock of 5 both
  // pass the per-line check and oversell.
  const quantityByProductId = new Map<string, number>();
  for (const item of rawItems) {
    quantityByProductId.set(item.productId, (quantityByProductId.get(item.productId) ?? 0) + item.quantity);
  }
  const items = [...quantityByProductId].map(([productId, quantity]) => ({ productId, quantity }));

  const user = await verifyUser(request);
  if (paymentMethod === "fib" && !user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const orderId = typeof body.orderId === "string" && UUID_RE.test(body.orderId)
    ? body.orderId.toLowerCase()
    : crypto.randomUUID();

  // Idempotent replay: this attempt already created its order.
  const replay = await findReplay(admin, orderId, user?.id ?? null, phone);
  if (replay) return replay;

  // Price and validate stock from the database — never from what the
  // browser sent (see supabase/migrations/0003_fib_payments.sql).
  const ids = [...new Set(items.map((i) => i.productId))];
  const { data: products, error: productsError } = await admin
    .from("products")
    .select("id, name_en, name_ar, name_ckb, price, stock")
    .in("id", ids);
  if (productsError) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  let subtotal = 0;
  const orderItems: {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }[] = [];

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) {
      return NextResponse.json(
        { error: "product_unavailable", productId: item.productId },
        { status: 409 }
      );
    }
    if (product.stock < item.quantity) {
      return NextResponse.json(
        { error: "out_of_stock", productId: item.productId, available: product.stock },
        { status: 409 }
      );
    }
    const unitPrice = Number(product.price);
    subtotal += unitPrice * item.quantity;
    orderItems.push({
      product_id: product.id,
      product_name: pickName(product, locale),
      quantity: item.quantity,
      unit_price: unitPrice,
    });
  }

  const total = subtotal;

  const orderRow: Record<string, unknown> = {
    id: orderId,
    user_id: user?.id ?? null,
    full_name: fullName,
    phone,
    city,
    address,
    notes,
    subtotal,
    total,
    currency: "IQD",
    payment_method: paymentMethod,
  };

  if (paymentMethod === "fib") {
    let payment;
    try {
      payment = await createFibPayment({
        amount: Math.round(total),
        description: `KurdishTCG order #${orderId.slice(0, 8).toUpperCase()}`,
        callbackUrl: `${siteUrl()}/api/fib/webhook`,
        redirectUrl: `${siteUrl()}/${locale}/account/orders/${orderId}`,
      });
    } catch (err) {
      // Third-party error text stays in the server log, not the response.
      console.error("[checkout] FIB create failed:", err instanceof FibPayError ? err.message : err);
      return NextResponse.json({ error: "fib_error" }, { status: 502 });
    }

    orderRow.payment_status = "pending";
    orderRow.fib_payment_id = payment.paymentId;
    orderRow.fib_readable_code = payment.readableCode;
    orderRow.fib_valid_until = payment.validUntil;

    const { error: insertError } = await admin.from("orders").insert(orderRow);
    if (insertError) {
      // Don't leave a payable-but-orphaned payment sitting at FIB.
      await cancelFibPayment(payment.paymentId).catch(() => {});
      // A concurrent duplicate of this same attempt won the insert.
      if (insertError.code === "23505") {
        const raced = await findReplay(admin, orderId, user?.id ?? null, phone);
        if (raced) return raced;
      }
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    const { error: itemsError } = await admin
      .from("order_items")
      .insert(orderItems.map((i) => ({ ...i, order_id: orderId })));
    if (itemsError) {
      await cancelFibPayment(payment.paymentId).catch(() => {});
      await rollbackOrder(admin, orderId);
      return itemsErrorResponse(admin, itemsError);
    }

    return NextResponse.json({
      orderId,
      payment: {
        paymentId: payment.paymentId,
        readableCode: payment.readableCode,
        qrCode: payment.qrCode,
        validUntil: payment.validUntil,
        personalAppLink: payment.personalAppLink,
        businessAppLink: payment.businessAppLink,
        corporateAppLink: payment.corporateAppLink,
      },
    });
  }

  const { error: insertError } = await admin.from("orders").insert(orderRow);
  if (insertError) {
    if (insertError.code === "23505") {
      const raced = await findReplay(admin, orderId, user?.id ?? null, phone);
      if (raced) return raced;
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  const { error: itemsError } = await admin
    .from("order_items")
    .insert(orderItems.map((i) => ({ ...i, order_id: orderId })));
  if (itemsError) {
    await rollbackOrder(admin, orderId);
    return itemsErrorResponse(admin, itemsError);
  }

  after(() => notifyNewOrder(orderId));
  return NextResponse.json({ orderId });
}

/**
 * If `orderId` already exists, answer for it instead of creating anything:
 * the original order when it's the same shopper's retry, 409 otherwise (a
 * client can pick its own id, so never leak someone else's order). FIB QR
 * codes aren't stored, so a replayed FIB checkout returns `replayed: true`
 * and the client sends the shopper to the order page, whose "Pay now"
 * issues a fresh code.
 */
async function findReplay(
  admin: ReturnType<typeof getSupabaseAdmin>,
  orderId: string,
  userId: string | null,
  phone: string
): Promise<NextResponse | null> {
  const { data: existing } = await admin
    .from("orders")
    .select("id, user_id, phone")
    .eq("id", orderId)
    .maybeSingle();
  if (!existing) return null;
  if (existing.user_id !== userId || existing.phone !== phone) {
    return NextResponse.json({ error: "order_conflict" }, { status: 409 });
  }
  return NextResponse.json({ orderId, replayed: true });
}

/**
 * Undo a half-created order (its `orders` row exists but the items insert
 * failed). Deleting the order cascades to any items and, via the 0007
 * trigger, gives their stock back. Retries once and logs loudly if it still
 * fails, since an itemless order would otherwise sit in the dashboard.
 */
async function rollbackOrder(admin: ReturnType<typeof getSupabaseAdmin>, orderId: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { error } = await admin.from("orders").delete().eq("id", orderId);
    if (!error) return;
    console.error(`[checkout] rollback of order ${orderId} failed (attempt ${attempt + 1}):`, error.message);
  }
}

/**
 * The order_items stock trigger (migration 0007) raises `out_of_stock:<id>`
 * when another checkout took the last units between our stock read and the
 * insert — answer the same way as the up-front stock check.
 */
async function itemsErrorResponse(
  admin: ReturnType<typeof getSupabaseAdmin>,
  error: { message: string }
) {
  const match = /out_of_stock:(\S+)/.exec(error.message);
  if (!match) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  const productId = match[1];
  const { data } = await admin.from("products").select("stock").eq("id", productId).maybeSingle();
  return NextResponse.json(
    { error: "out_of_stock", productId, available: data?.stock ?? 0 },
    { status: 409 }
  );
}
