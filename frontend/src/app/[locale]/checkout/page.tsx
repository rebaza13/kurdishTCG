"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/price-tag";
import { FibPaymentDialog, type FibPaymentInfo } from "@/components/fib-payment-dialog";
import { cartSubtotal, useCartStore } from "@/lib/cart-store";
import { getAccessToken, useSupabaseUser } from "@/lib/use-supabase-user";
import { getSupabaseClient } from "@/lib/supabase/client";
import { normalizeIraqiMobile } from "@/lib/phone";
import type { Locale } from "@/i18n/routing";

function Field({
  label,
  hint,
  error,
  ...props
}: {
  label: string;
  hint?: string;
  error?: string | null;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <input
        {...props}
        aria-invalid={error ? true : undefined}
        className="border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 outline-none rounded-[var(--radius-xs)] focus-visible:border-[var(--color-accent)]"
      />
      {error ? (
        <span className="text-xs text-[var(--color-accent)]">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { items, clear } = useCartStore();
  const user = useSupabaseUser();

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "fib">("cash");
  const [placedId, setPlacedId] = useState<string | null>(null);
  const [placedPending, setPlacedPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [fibPayment, setFibPayment] = useState<{ orderId: string; payment: FibPaymentInfo } | null>(
    null
  );

  const subtotal = cartSubtotal(items);
  const total = subtotal;

  async function handleGoogle() {
    setGoogleError(null);
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
    if (error) setGoogleError(t("googleNotConfigured"));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPhoneError(null);

    const form = new FormData(e.currentTarget);
    const fullName = String(form.get("fullName") ?? "");
    const phone = normalizeIraqiMobile(String(form.get("phone") ?? ""));
    if (!phone) {
      setPhoneError(t("phoneInvalid"));
      return;
    }
    if (paymentMethod === "fib" && !user) {
      setError(t("signInRequired"));
      return;
    }

    setSubmitting(true);
    const city = String(form.get("city") ?? "");
    const address = String(form.get("address") ?? "");
    const notes = String(form.get("notes") ?? "") || null;

    try {
      const token = await getAccessToken();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          locale,
          fullName,
          phone,
          city,
          address,
          notes,
          paymentMethod,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "out_of_stock" || data.error === "product_unavailable") {
          setError(t("stockError"));
        } else if (data.error === "auth_required") {
          setError(t("signInRequired"));
        } else if (data.error === "fib_error") {
          setError(t("fibError"));
        } else {
          setError(t("submitError"));
        }
        return;
      }

      clear();
      if (paymentMethod === "fib" && data.payment) {
        setFibPayment({ orderId: data.orderId, payment: data.payment });
      } else {
        setPlacedId(data.orderId);
      }
    } catch {
      setError(t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (placedId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <span className="flex size-14 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]">
          <Check className="size-6" />
        </span>
        <h1 className="text-2xl">{t("placedTitle")}</h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-[44ch]">
          {placedPending ? t("pendingPaymentNote") : t("reservationNote")}
        </p>
        <p className="text-sm">
          {t("orderRef")}:{" "}
          <span className="font-mono font-semibold" dir="ltr">
            #{placedId.slice(0, 8).toUpperCase()}
          </span>
        </p>
        <div className="flex gap-3">
          {user && (
            <Link href={`/account/orders/${placedId}`}>
              <Button variant="secondary">{t("viewOrder")}</Button>
            </Link>
          )}
          <Link href="/">
            <Button variant="primary">{t("home")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !fibPayment) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <h1 className="text-2xl">{t("title")}</h1>
        <Link href="/franchises">
          <Button variant="primary">{t("shop")}</Button>
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
            <Field
              name="phone"
              label={t("phone")}
              type="tel"
              inputMode="tel"
              dir="ltr"
              placeholder="0750 123 4567"
              required
              autoComplete="tel"
              hint={t("phoneHint")}
              error={phoneError}
            />
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
          <label
            className="flex items-center gap-3 border-[length:var(--border-width)] border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-3.5 bg-[var(--color-surface)] cursor-pointer has-[:checked]:border-[var(--color-accent)]"
          >
            <input
              type="radio"
              name="paymentMethodChoice"
              checked={paymentMethod === "cash"}
              onChange={() => setPaymentMethod("cash")}
              className="size-4 accent-[var(--color-accent)]"
            />
            <div>
              <p className="text-sm font-heading font-[var(--font-heading-weight)]">
                {t("cashOnDelivery")}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">{t("cashOnDeliveryNote")}</p>
            </div>
          </label>
          <label
            className="flex items-center gap-3 border-[length:var(--border-width)] border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-3.5 bg-[var(--color-surface)] cursor-pointer has-[:checked]:border-[var(--color-accent)]"
          >
            <input
              type="radio"
              name="paymentMethodChoice"
              checked={paymentMethod === "fib"}
              onChange={() => setPaymentMethod("fib")}
              className="size-4 accent-[var(--color-accent)]"
            />
            <div className="flex-1">
              <p className="text-sm font-heading font-[var(--font-heading-weight)]">
                {t("bankTransfer")}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">{t("bankTransferNote")}</p>
            </div>
          </label>

          {paymentMethod === "fib" && user === null && (
            <div className="flex flex-col gap-3 border-[length:var(--border-width)] border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-4 bg-[var(--color-surface)]">
              <p className="text-sm">{t("signInToPayTitle")}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{t("signInToPayBody")}</p>
              <Button type="button" variant="secondary" onClick={handleGoogle}>
                <GoogleIcon />
                {t("continueWithGoogle")}
              </Button>
              {googleError && <p className="text-xs text-[var(--color-accent)]">{googleError}</p>}
              <Link href="/account" className="text-xs text-[var(--color-accent)] underline-offset-2 hover:underline">
                {t("useEmailInstead")}
              </Link>
            </div>
          )}
        </section>

        {error && <p className="text-sm text-[var(--color-accent)]">{error}</p>}

        <Button
          type="submit"
          size="lg"
          className="w-full justify-center"
          disabled={submitting || (paymentMethod === "fib" && !user)}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {paymentMethod === "fib" ? t("payWithFib") : t("placeOrder")}
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
          <p className="text-xs text-[var(--color-text-muted)]">
            {paymentMethod === "fib" ? t("payNowNote") : t("noPaymentTaken")}
          </p>
        </div>
      </aside>

      {fibPayment && (
        <FibPaymentDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setPlacedPending(true);
              setPlacedId(fibPayment.orderId);
              setFibPayment(null);
            }
          }}
          orderId={fibPayment.orderId}
          payment={fibPayment.payment}
          locale={locale}
          onPaid={() => {
            setPlacedPending(false);
            setPlacedId(fibPayment.orderId);
          }}
          onViewOrder={() => router.push(`/account/orders/${fibPayment.orderId}`)}
        />
      )}
    </div>
  );
}
