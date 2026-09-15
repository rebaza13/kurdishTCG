"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/price-tag";
import { cartSubtotal, useCartStore } from "@/lib/cart-store";
import { getSupabaseClient } from "@/lib/supabase/client";

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <input
        {...props}
        className="border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 outline-none rounded-[var(--radius-xs)] focus-visible:border-[var(--color-accent)]"
      />
    </label>
  );
}

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const { items, clear } = useCartStore();
  const [placed, setPlaced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = cartSubtotal(items);
  const total = subtotal;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const fullName = String(form.get("fullName") ?? "");
    const phone = String(form.get("phone") ?? "");
    const city = String(form.get("city") ?? "");
    const address = String(form.get("address") ?? "");
    const notes = String(form.get("notes") ?? "") || null;

    try {
      const supabase = getSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Generate the id client-side rather than relying on `.select()` after
      // insert: Postgres requires RETURNING output to also satisfy the
      // table's SELECT policy, and guest orders (user_id null) deliberately
      // can't be read back by an anonymous client — only by their owner or
      // an admin. Knowing the id upfront avoids needing that read entirely.
      const orderId = crypto.randomUUID();

      const { error: orderError } = await supabase.from("orders").insert({
        id: orderId,
        user_id: user?.id ?? null,
        full_name: fullName,
        phone,
        city,
        address,
        notes,
        subtotal,
        total,
        currency: "USD",
        payment_method: "cash",
      });
      if (orderError) throw orderError;

      const { error: itemsError } = await supabase.from("order_items").insert(
        items.map((item) => ({
          order_id: orderId,
          product_id: item.productId,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
        }))
      );
      if (itemsError) throw itemsError;

      setPlaced(true);
      clear();
    } catch {
      setError(t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (placed) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <span className="flex size-14 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]">
          <Check className="size-6" />
        </span>
        <h1 className="text-2xl">{t("placedTitle")}</h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-[44ch]">
          {t("reservationNote")}
        </p>
        <Link href="/">
          <Button variant="primary">Home</Button>
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <h1 className="text-2xl">{t("title")}</h1>
        <Link href="/franchises">
          <Button variant="primary">Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 md:px-10 grid lg:grid-cols-[1fr_380px] gap-10">
      <form className="flex flex-col gap-10" onSubmit={handleSubmit}>
        <h1 className="text-3xl">{t("title")}</h1>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg">{t("contact")}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field name="fullName" label={t("fullName")} required autoComplete="name" />
            <Field name="phone" label={t("phone")} type="tel" required autoComplete="tel" />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg">{t("shipping")}</h2>
          <Field name="city" label={t("city")} required autoComplete="address-level2" />
          <Field name="address" label={t("address")} required autoComplete="street-address" />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs text-[var(--color-text-muted)]">{t("notes")}</span>
            <textarea
              name="notes"
              rows={3}
              className="border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 outline-none rounded-[var(--radius-xs)] focus-visible:border-[var(--color-accent)] resize-none"
            />
          </label>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg">{t("payment")}</h2>
          <div className="flex items-center gap-3 border-[length:var(--border-width)] border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-3.5 bg-[var(--color-surface)]">
            <input type="radio" checked readOnly className="size-4 accent-[var(--color-accent)]" />
            <div>
              <p className="text-sm font-heading font-[var(--font-heading-weight)]">
                {t("cashOnDelivery")}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">{t("cashOnDeliveryNote")}</p>
            </div>
          </div>
        </section>

        {error && <p className="text-sm text-[var(--color-accent)]">{error}</p>}

        <Button type="submit" size="lg" className="w-full justify-center" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("placeOrder")}
        </Button>
      </form>

      <aside className="h-fit border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col gap-4 rounded-[var(--radius-lg)]">
        <h2 className="text-lg">{t("orderSummary")}</h2>
        <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between text-sm gap-3">
              <span className="line-clamp-1">
                {item.name} × {item.quantity}
              </span>
              <PriceTag value={item.price * item.quantity} />
            </div>
          ))}
        </div>
        <div className="border-t-[length:var(--border-width)] border-[var(--color-border)] pt-4 flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between pt-2">
            <span className="font-heading font-[var(--font-heading-weight)]">{t("total")}</span>
            <PriceTag value={total} className="text-lg" />
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">{t("noPaymentTaken")}</p>
        </div>
      </aside>
    </div>
  );
}
