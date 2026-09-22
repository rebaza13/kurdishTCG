import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyUser } from "@/lib/supabase/verify-user";
import { normalizeIraqiMobile } from "@/lib/phone";
import { cancelFibPayment, createFibPayment, FibPayError } from "@/lib/fib";
import { locales, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface CheckoutItem {
  productId: string;
  quantity: number;
}

interface CheckoutBody {
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

function pickName(row: { name_en: string; name_ar: string; name_ckb: string }, locale: Locale) {
  return row[`name_${locale}` as const] || row.name_en;
}

export async function POST(request: Request) {
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
  const items = Array.isArray(body.items) ? body.items : [];

  if (!fullName || !phone || !city || !address) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (items.length === 0 || items.some((i) => !i.productId || !(i.quantity > 0))) {
    return NextResponse.json({ error: "invalid_items" }, { status: 400 });
  }

  const user = await verifyUser(request);
  if (paymentMethod === "fib" && !user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

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
  const orderId = crypto.randomUUID();

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
      const message = err instanceof FibPayError ? err.message : "FIB payment creation failed";
      return NextResponse.json({ error: "fib_error", message }, { status: 502 });
    }

    orderRow.payment_status = "pending";
    orderRow.fib_payment_id = payment.paymentId;
    orderRow.fib_readable_code = payment.readableCode;
    orderRow.fib_valid_until = payment.validUntil;

    const { error: insertError } = await admin.from("orders").insert(orderRow);
    if (insertError) {
      // Don't leave a payable-but-orphaned payment sitting at FIB.
      await cancelFibPayment(payment.paymentId).catch(() => {});
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    const { error: itemsError } = await admin
      .from("order_items")
      .insert(orderItems.map((i) => ({ ...i, order_id: orderId })));
    if (itemsError) {
      await cancelFibPayment(payment.paymentId).catch(() => {});
      await admin.from("orders").delete().eq("id", orderId);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
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
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  const { error: itemsError } = await admin
    .from("order_items")
    .insert(orderItems.map((i) => ({ ...i, order_id: orderId })));
  if (itemsError) {
    await admin.from("orders").delete().eq("id", orderId);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ orderId });
}
