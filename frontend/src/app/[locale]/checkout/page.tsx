"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2, ShoppingBag } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/price-tag";
import { FibPaymentDialog, type FibPaymentInfo } from "@/components/fib-payment-dialog";
import { cartSubtotal, useCartStore, useLiveCartStock } from "@/lib/cart-store";
import { getAccessToken, useSupabaseUser } from "@/lib/use-supabase-user";
import { FIB_ENABLED } from "@/lib/features";
import { normalizeIraqiMobile } from "@/lib/phone";
import { GOVERNORATES } from "@/lib/governorates";
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
        className="w-full border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-base md:text-sm outline-none rounded-[var(--radius-xs)] transition-colors focus-visible:border-[var(--color-accent)] aria-[invalid=true]:border-[var(--color-accent)] rtl:text-right placeholder:text-[var(--color-text-muted)]"
      />
      {error ? (
        <span role="alert" className="text-xs text-[var(--color-accent)]">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const cartT = useTranslations("cart");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { items, clear, syncStock, removeItem } = useCartStore();
  useLiveCartStock();
  // One id per checkout attempt, sent as the order id so a double-submit or
  // a retried request can't create two orders (see /api/checkout).
  const attemptIdRef = useRef<string | null>(null);
  const user = useSupabaseUser();

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "fib">("cash");
  const [placedId, setPlacedId] = useState<string | null>(null);
  const [placedPending, setPlacedPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [fibPayment, setFibPayment] = useState<{ orderId: string; payment: FibPaymentInfo } | null>(
    null
  );

  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    // The submit button sits below the fold on phones; bring the message into view.
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  const subtotal = cartSubtotal(items);
  const total = subtotal;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPhoneError(null);

    if (submitting) return;
    const form = new FormData(e.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const phone = normalizeIraqiMobile(String(form.get("phone") ?? ""));
    if (!phone) {
      setPhoneError(t("phoneInvalid"));
      const phoneInput = e.currentTarget.elements.namedItem("phone");
      if (phoneInput instanceof HTMLInputElement) phoneInput.focus();
      return;
    }
    if (!user && paymentMethod === "fib") {
      // Paying online happens from the account's order page.
      setError(t("signInRequired"));
      return;
    }

    setSubmitting(true);
    const city = String(form.get("city") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim() || null;
    attemptIdRef.current ??= crypto.randomUUID();

    try {
      const token = await getAccessToken();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderId: attemptIdRef.current,
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
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.error === "out_of_stock" && typeof data.available === "number") {
          // Reflect the real stock in the cart so the summary shows what's left.
          syncStock(data.productId, data.available);
          setError(t("stockError"));
        } else if (data.error === "product_unavailable") {
          removeItem(data.productId);
          setError(t("stockError"));
        } else if (data.error === "invalid_phone") {
          setPhoneError(t("phoneInvalid"));
        } else if (data.error === "missing_fields" || data.error === "field_too_long") {
          setError(t("fieldsError"));
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
      attemptIdRef.current = null;
      // The confirmation replaces a long form — start it at the top.
      window.scrollTo({ top: 0 });
      if (paymentMethod === "fib" && data.payment) {
        setFibPayment({ orderId: data.orderId, payment: data.payment });
      } else if (paymentMethod === "fib") {
        // Replayed FIB attempt (no fresh QR) — pay from the order page.
        router.push(`/account/orders/${data.orderId}`);
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
        <div className="flex flex-wrap justify-center gap-3">
          {user && (
            <Button asChild variant="secondary">
              <Link href={`/account/orders/${placedId}`}>{t("viewOrder")}</Link>
            </Button>
          )}
          <Button asChild variant="primary">
            <Link href="/">{t("home")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !fibPayment) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <ShoppingBag className="size-10 text-[var(--color-text-muted)]" />
        <h1 className="text-2xl">{cartT("empty")}</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{cartT("emptyBody")}</p>
        <Button asChild variant="primary">
          <Link href="/franchises">{t("shop")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 md:px-10 grid lg:grid-cols-[1fr_380px] gap-10">
      <form className="flex flex-col gap-10" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl">{t("title")}</h1>
          <p className="text-sm text-[var(--color-text-muted)] max-w-[52ch]">{t("guestNote")}</p>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg">{t("contact")}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field name="fullName" label={t("fullName")} required maxLength={120} autoComplete="name" />
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
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs text-[var(--color-text-muted)]">{t("city")}</span>
            <select
              name="city"
              required
              defaultValue=""
              autoComplete="address-level1"
              className="w-full border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-base md:text-sm outline-none rounded-[var(--radius-xs)] transition-colors focus-visible:border-[var(--color-accent)] rtl:text-right"
            >
              <option value="" disabled>
                {t("selectCity")}
              </option>
              {GOVERNORATES.map((g) => (
                <option key={g.en} value={g.en}>
                  {g[locale]}
                </option>
              ))}
            </select>
          </label>
          <Field
            name="address"
            label={t("address")}
            required
            maxLength={500}
            autoComplete="street-address"
          />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs text-[var(--color-text-muted)]">{t("notes")}</span>
            <textarea
              name="notes"
              rows={3}
              maxLength={1000}
              className="w-full border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-base md:text-sm outline-none rounded-[var(--radius-xs)] transition-colors focus-visible:border-[var(--color-accent)] resize-none"
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
            className="flex items-center gap-3 border-[length:var(--border-width)] border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-3.5 bg-[var(--color-surface)] cursor-pointer has-[:checked]:border-[var(--color-accent)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
          >
            <input
              type="radio"
              name="paymentMethodChoice"
              checked={paymentMethod === "fib"}
              onChange={() => setPaymentMethod("fib")}
              disabled={!FIB_ENABLED}
              className="size-4 accent-[var(--color-accent)]"
            />
            <div className="flex-1">
              <p className="flex items-center gap-2 text-sm font-heading font-[var(--font-heading-weight)]">
                {t("bankTransfer")}
                {!FIB_ENABLED && (
                  <span className="rounded-full bg-[var(--color-chip)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    {t("fibComingSoon")}
                  </span>
                )}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">{t("bankTransferNote")}</p>
            </div>
          </label>

        </section>

        {error && (
          <p
            ref={errorRef}
            role="alert"
            className="rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-[var(--color-accent)] px-4 py-3 text-sm text-[var(--color-accent)]"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full justify-center"
          disabled={submitting}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {paymentMethod === "fib" ? t("payWithFib") : t("placeOrder")}
        </Button>
      </form>

      <aside className="h-fit border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col gap-4 rounded-[var(--radius-lg)] lg:sticky lg:top-24 max-lg:-order-1">
        <h2 className="text-lg">{t("orderSummary")}</h2>
        <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center gap-3 text-sm">
              <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-[var(--radius-xs)] bg-[var(--color-neutral-200)]">
                <Image src={item.image} alt="" fill sizes="44px" className="object-cover" />
                <span className="absolute -top-0 end-0 min-w-5 rounded-es-[var(--radius-xs)] bg-[var(--color-text)] px-1 text-center text-[10px] font-semibold leading-4 text-[var(--color-bg)]">
                  {item.quantity}
                </span>
              </div>
              <span className="min-w-0 flex-1 line-clamp-2">{item.name}</span>
              <PriceTag value={item.price * item.quantity} className="shrink-0 whitespace-nowrap" />
            </div>
          ))}
        </div>
        <div className="border-t-[length:var(--border-width)] border-[var(--color-border)] pt-4 flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between pt-2">
            <span className="font-heading font-[var(--font-heading-weight)]">{t("total")}</span>
            <PriceTag value={total} className="text-lg whitespace-nowrap" />
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
