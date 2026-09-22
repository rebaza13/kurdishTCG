"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { Check, Loader2, RefreshCw, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/use-supabase-user";

export interface FibPaymentInfo {
  paymentId: string;
  readableCode: string;
  qrCode: string;
  validUntil: string;
  personalAppLink: string;
  businessAppLink: string;
  corporateAppLink: string;
}

type PollStatus = "pending" | "paid" | "declined" | "refunded" | "error";

/** Bank's own best-practice doc: wait 15s for the callback, then poll every 5s. */
const INITIAL_WAIT_MS = 15_000;
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_MS = 6 * 60_000;

function useCountdown(validUntil: string): number {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(validUntil).getTime() - Date.now())
  );
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, new Date(validUntil).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [validUntil]);
  return remaining;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FibPaymentDialog({
  open,
  onOpenChange,
  orderId,
  payment,
  locale,
  onPaid,
  onViewOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  payment: FibPaymentInfo;
  locale: string;
  onPaid: () => void;
  onViewOrder: () => void;
}) {
  const t = useTranslations("payment");
  const [current, setCurrent] = useState(payment);
  const [status, setStatus] = useState<PollStatus>("pending");
  const [declineReason, setDeclineReason] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(false);
  const stopRef = useRef(false);
  const remaining = useCountdown(current.validUntil);
  const expired = remaining <= 0 && status === "pending";

  const poll = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/fib/status/${current.paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.paymentStatus === "paid") setStatus("paid");
      else if (data.paymentStatus === "declined") {
        setStatus("declined");
        if (data.decliningReason) setDeclineReason(t(`declineReason.${data.decliningReason}`));
      } else if (data.paymentStatus === "refunded" || data.paymentStatus === "refund_requested")
        setStatus("refunded");
    } catch {
      // transient network error — the next poll tick will retry
    }
  }, [current.paymentId, t]);

  useEffect(() => {
    if (!open || status !== "pending") return;
    stopRef.current = false;
    const deadline = Date.now() + MAX_POLL_MS;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (stopRef.current || Date.now() > deadline) return;
      await poll();
      if (stopRef.current) return;
      timeoutId = setTimeout(tick, POLL_INTERVAL_MS);
    };

    const initial = setTimeout(tick, INITIAL_WAIT_MS);
    return () => {
      stopRef.current = true;
      clearTimeout(initial);
      clearTimeout(timeoutId);
    };
  }, [open, status, poll]);

  useEffect(() => {
    if (status === "paid") onPaid();
  }, [status, onPaid]);

  async function handleRetry() {
    setRetrying(true);
    setRetryError(false);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/fib/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, locale }),
      });
      if (!res.ok) throw new Error("retry failed");
      const data = await res.json();
      setCurrent(data.payment);
      setStatus("pending");
      setDeclineReason(null);
    } catch {
      setRetryError(true);
    } finally {
      setRetrying(false);
    }
  }

  const showRetry = status === "declined" || expired;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-[var(--color-border-strong)] bg-[var(--color-bg)] p-6 shadow-[var(--shadow-lg)]"
          aria-describedby={undefined}
        >
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg">{t("title")}</Dialog.Title>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Close">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          {status === "paid" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <span className="flex size-14 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]">
                <Check className="size-6" />
              </span>
              <div>
                <p className="font-heading font-[var(--font-heading-weight)]">
                  {t("paidSuccessTitle")}
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {t("paidSuccessBody")}
                </p>
              </div>
              <Button variant="primary" size="lg" className="w-full justify-center" onClick={onViewOrder}>
                {t("viewOrder")}
              </Button>
            </div>
          )}

          {status === "refunded" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">{t("statusRefunded")}</p>
              <Button variant="secondary" size="md" onClick={onViewOrder}>
                {t("viewOrder")}
              </Button>
            </div>
          )}

          {status === "pending" && !expired && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-[var(--radius-md)] border-[length:var(--border-width)] border-[var(--color-border)] bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URI, not an optimizable asset */}
                <img
                  src={`data:image/png;base64,${current.qrCode}`}
                  alt={t("scanQr")}
                  width={220}
                  height={220}
                  className="size-[220px]"
                />
              </div>
              <p className="text-sm text-[var(--color-text-muted)] text-center">{t("scanQr")}</p>
              <p className="font-mono text-xs text-[var(--color-text-muted)]" dir="ltr">
                {current.readableCode}
              </p>

              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin text-[var(--color-accent)]" />
                <span>{t("waitingForPayment")}</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                {t("expiresIn", { time: formatCountdown(remaining) })}
              </p>

              <div className="flex w-full items-center gap-3 text-xs text-[var(--color-text-muted)]">
                <span className="h-px flex-1 bg-[var(--color-border)]" />
                {t("orOpenApp")}
                <span className="h-px flex-1 bg-[var(--color-border)]" />
              </div>
              <a href={current.personalAppLink} className="w-full">
                <Button variant="secondary" size="md" className="w-full justify-center">
                  <Smartphone className="size-4" />
                  {t("openFibApp")}
                </Button>
              </a>
            </div>
          )}

          {(status === "declined" || expired) && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <p className="text-sm text-[var(--color-accent)]">
                {expired ? t("statusExpired") : t("statusDeclined")}
              </p>
              {declineReason && (
                <p className="text-xs text-[var(--color-text-muted)]">{declineReason}</p>
              )}
              {retryError && <p className="text-xs text-[var(--color-accent)]">{t("retryError")}</p>}
              {showRetry && (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full justify-center"
                  onClick={handleRetry}
                  disabled={retrying}
                >
                  {retrying ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  {t("retry")}
                </Button>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
