"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/price-tag";
import { FibPaymentDialog, type FibPaymentInfo } from "@/components/fib-payment-dialog";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getAccessToken, useSupabaseUser } from "@/lib/use-supabase-user";
import type { Locale } from "@/i18n/routing";
import { statusPillClass } from "../../order-status";

interface OrderDetail {
  id: string;
  status: string;
  payment_method: string;
  payment_status: string | null;
  fib_payment_id: string | null;
  fib_readable_code: string | null;
  fib_valid_until: string | null;
  fib_paid_at: string | null;
  fib_declining_reason: string | null;
  fib_paid_by_name: string | null;
  full_name: string;
  phone: string;
  city: string;
  address: string;
  subtotal: number;
  total: number;
  currency: string;
  created_at: string;
  order_items: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }[];
}

const PROGRESS_STEPS = ["requested", "confirmed", "shipped", "delivered"] as const;
const RETRYABLE = new Set(["pending", "declined"]);
/** Mirrors /api/fib/retry: shop-cancelled orders can't be paid again. */
const REVIVABLE_DECLINE_REASONS = new Set(["PAYMENT_EXPIRATION", "SERVER_FAILURE"]);

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("account");
  const checkoutT = useTranslations("checkout");
  const statusT = useTranslations("orderStatus");
  const paymentStatusT = useTranslations("paymentStatus");
  const paymentT = useTranslations("payment");
  const locale = useLocale() as Locale;
  const user = useSupabaseUser();

  const [order, setOrder] = useState<OrderDetail | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(false);
  const [fibPayment, setFibPayment] = useState<FibPaymentInfo | null>(null);
  const [cancelStep, setCancelStep] = useState<"idle" | "confirm" | "busy">("idle");
  const [cancelFailed, setCancelFailed] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .maybeSingle();
    setOrder((data as OrderDetail | null) ?? null);
  }, [id]);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const supabase = getSupabaseClient();
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setOrder((data as OrderDetail | null) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [id, userId]);

  const refreshPaymentStatus = useCallback(async () => {
    if (!order?.fib_payment_id) return;
    setRefreshing(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`/api/fib/status/${order.fib_payment_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (res?.ok) await load();
    } finally {
      setRefreshing(false);
    }
  }, [order?.fib_payment_id, load]);

  // Poll while a payment is pending — the FIB webhook only reaches a public
  // deployment, so this is what actually confirms payment in local dev.
  useEffect(() => {
    if (order?.payment_method !== "fib" || order.payment_status !== "pending") return;
    const id = setInterval(refreshPaymentStatus, 5000);
    return () => clearInterval(id);
  }, [order?.payment_method, order?.payment_status, refreshPaymentStatus]);

  async function handleRetry() {
    if (!order) return;
    setRetrying(true);
    setRetryError(false);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/fib/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.id, locale }),
      });
      if (!res.ok) throw new Error("retry failed");
      const data = await res.json();
      setFibPayment(data.payment);
    } catch {
      setRetryError(true);
    } finally {
      setRetrying(false);
    }
  }

  async function handleCancel() {
    if (!order) return;
    setCancelStep("busy");
    setCancelFailed(false);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.id }),
      });
      if (!res.ok) throw new Error("cancel failed");
      await load();
      setCancelStep("idle");
    } catch {
      setCancelFailed(true);
      setCancelStep("idle");
      await load(); // the shop may have confirmed it meanwhile — show the real status
    }
  }

  const back = (
    <Link
      href="/account"
      className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
    >
      <ArrowLeft className="size-4 rtl:-scale-x-100" /> {t("backToAccount")}
    </Link>
  );

  if (user === null) {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-16 md:px-10 flex flex-col items-start gap-4">
        {back}
        <p className="text-sm text-[var(--color-text-muted)]">{t("signInToView")}</p>
        <Button asChild variant="primary">
          <Link href="/account">{t("signIn")}</Link>
        </Button>
      </div>
    );
  }

  if (user === undefined || order === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-16 md:px-10">
        {back}
        <p className="text-sm text-[var(--color-text-muted)]">{t("orderNotFound")}</p>
      </div>
    );
  }

  const canRetry =
    order.payment_method === "fib" &&
    RETRYABLE.has(order.payment_status ?? "") &&
    (order.status === "requested" ||
      (order.status === "cancelled" &&
        REVIVABLE_DECLINE_REASONS.has(order.fib_declining_reason ?? "")));
  const dateTimeFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-12 md:px-10 md:py-16 flex flex-col gap-8">
      <div>{back}</div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-[var(--color-text-muted)]">{checkoutT("orderRef")}</p>
          <h1 className="text-2xl font-mono" dir="ltr">
            #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {dateTimeFmt.format(new Date(order.created_at))}
          </p>
        </div>
        <span
          className={`text-xs border rounded-[var(--radius-full)] px-3 py-1 ${statusPillClass[order.status] ?? ""}`}
        >
          {statusT(order.status)}
        </span>
      </div>

      {order.status === "cancelled" ? (
        <p className="rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-sm text-[var(--color-text-muted)]">
          {t("cancelledNote")}
        </p>
      ) : (
        <ol
          className="flex items-start rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5"
          aria-label={t("progressTitle")}
        >
          {PROGRESS_STEPS.map((step, i) => {
            const reached = i <= PROGRESS_STEPS.indexOf(order.status as (typeof PROGRESS_STEPS)[number]);
            const current = step === order.status;
            return (
              <li key={step} className="relative flex flex-1 flex-col items-center gap-2 text-center">
                {i > 0 && (
                  <span
                    aria-hidden
                    className={`absolute top-3 end-1/2 h-0.5 w-full ${reached ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}`}
                  />
                )}
                <span
                  aria-current={current ? "step" : undefined}
                  className={`relative z-10 flex size-6 items-center justify-center rounded-full border-2 text-[11px] font-semibold ${
                    reached
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                  } ${current ? "ring-4 ring-[color-mix(in_srgb,var(--color-accent)_25%,transparent)]" : ""}`}
                >
                  {reached ? "✓" : i + 1}
                </span>
                <span
                  className={`text-[11px] leading-tight sm:text-xs ${current ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}`}
                >
                  {statusT(step)}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex flex-col divide-y-[length:var(--border-width)] divide-[var(--color-border)] border-y-[length:var(--border-width)] border-[var(--color-border)]">
        {order.order_items.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-3 text-sm gap-3">
            <span className="min-w-0">
              {item.product_name}{" "}
              <span className="text-[var(--color-text-muted)]" dir="ltr">
                × {item.quantity}
              </span>
            </span>
            <PriceTag value={item.unit_price * item.quantity} className="shrink-0" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="font-heading font-[var(--font-heading-weight)]">{checkoutT("total")}</span>
        <PriceTag value={order.total} className="text-lg" />
      </div>

      <div className={`grid gap-4 ${order.payment_method === "fib" ? "" : "sm:grid-cols-2"}`}>
        <div className="flex flex-col gap-1 rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-[var(--color-border)] p-5 text-sm">
          <h2 className="mb-1 text-sm font-heading font-[var(--font-heading-weight)]">
            {checkoutT("shipping")}
          </h2>
          <p>{order.full_name}</p>
          <p dir="ltr" className="rtl:text-right text-[var(--color-text-muted)]">
            {order.phone}
          </p>
          <p className="text-[var(--color-text-muted)]">
            {order.city} · {order.address}
          </p>
        </div>
        {order.payment_method !== "fib" && (
          <div className="flex flex-col gap-1 rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-[var(--color-border)] p-5 text-sm">
            <h2 className="mb-1 text-sm font-heading font-[var(--font-heading-weight)]">
              {checkoutT("payment")}
            </h2>
            <p>{checkoutT("cashOnDelivery")}</p>
            <p className="text-[var(--color-text-muted)]">{checkoutT("noPaymentTaken")}</p>
          </div>
        )}
      </div>

      {order.payment_method === "fib" && (
        <div className="border-[length:var(--border-width)] border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 flex flex-col gap-3 bg-[var(--color-surface)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-heading font-[var(--font-heading-weight)]">
              {t("paymentSectionTitle")} · FIB
            </h2>
            {order.payment_status === "pending" && (
              <button
                type="button"
                onClick={refreshPaymentStatus}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              >
                <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
                {t("refreshStatus")}
              </button>
            )}
          </div>
          <p className="text-sm">
            {paymentStatusT(order.payment_status ?? "pending")}
            {order.fib_readable_code && (
              <span className="ms-2 font-mono text-xs text-[var(--color-text-muted)]" dir="ltr">
                {order.fib_readable_code}
              </span>
            )}
          </p>
          {order.fib_paid_at && (
            <p className="text-xs text-[var(--color-text-muted)]">
              {t("paidAt")}: {dateTimeFmt.format(new Date(order.fib_paid_at))}
              {order.fib_paid_by_name ? ` · ${order.fib_paid_by_name}` : ""}
            </p>
          )}
          {order.fib_declining_reason && (
            <p className="text-xs text-[var(--color-accent)]">
              {t("declineReasonLabel")}: {paymentT(`declineReason.${order.fib_declining_reason}`)}
            </p>
          )}
          {retryError && <p className="text-xs text-[var(--color-accent)]">{t("retryError")}</p>}
          {canRetry && (
            <Button
              variant="primary"
              className="justify-center"
              onClick={handleRetry}
              disabled={retrying}
            >
              {retrying ? <Loader2 className="size-4 animate-spin" /> : null}
              {order.payment_status === "pending" ? t("payNow") : t("retryPayment")}
            </Button>
          )}
        </div>
      )}

      {order.status === "requested" ? (
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-[var(--color-border)] p-5">
          {cancelFailed && <p className="text-xs text-[var(--color-accent)]">{t("cancelError")}</p>}
          {cancelStep === "idle" ? (
            <Button variant="outline" className="self-start" onClick={() => setCancelStep("confirm")}>
              {t("cancelOrder")}
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-3" role="alertdialog" aria-label={t("cancelPrompt")}>
              <span className="text-sm">{t("cancelPrompt")}</span>
              <Button variant="primary" onClick={handleCancel} disabled={cancelStep === "busy"}>
                {cancelStep === "busy" ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("cancelYes")}
              </Button>
              <Button variant="outline" onClick={() => setCancelStep("idle")} disabled={cancelStep === "busy"}>
                {t("cancelKeep")}
              </Button>
            </div>
          )}
        </div>
      ) : (
        order.status !== "cancelled" &&
        order.status !== "delivered" && (
          <p className="text-xs text-[var(--color-text-muted)]">{t("cancelLateHelp")}</p>
        )
      )}

      {fibPayment && (
        <FibPaymentDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setFibPayment(null);
              load();
            }
          }}
          orderId={order.id}
          payment={fibPayment}
          locale={locale}
          onPaid={() => {
            load();
          }}
          onViewOrder={() => {
            setFibPayment(null);
            load();
          }}
        />
      )}
    </div>
  );
}
