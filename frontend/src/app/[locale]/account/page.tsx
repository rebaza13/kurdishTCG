"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AuthError } from "@supabase/supabase-js";
import { ChevronRight, Loader2, LogOut, Package } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/price-tag";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/use-supabase-user";
import { statusPillClass } from "./order-status";

type OrderRow = {
  id: string;
  status: string;
  payment_method: string;
  payment_status: string | null;
  total: number;
  created_at: string;
};

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

/**
 * Supabase auth errors come back as English prose; map the stable `code`
 * to our own translated copy instead of showing `error.message` verbatim.
 */
function authErrorKey(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "errors.invalidCredentials";
    case "email_not_confirmed":
      return "errors.emailNotConfirmed";
    case "user_already_exists":
    case "email_exists":
      return "errors.userExists";
    case "weak_password":
      return "errors.weakPassword";
    case "email_address_invalid":
    case "validation_failed":
      return "errors.invalidEmail";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "errors.rateLimited";
    default:
      return error.status === 400 ? "errors.invalidCredentials" : "errors.generic";
  }
}

const inputClass =
  "w-full border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-base md:text-sm outline-none rounded-[var(--radius-xs)] transition-colors focus-visible:border-[var(--color-accent)] aria-[invalid=true]:border-[var(--color-accent)]";

export default function AccountPage() {
  const t = useTranslations("account");
  const checkoutT = useTranslations("checkout");
  const statusT = useTranslations("orderStatus");
  const paymentStatusT = useTranslations("paymentStatus");
  const locale = useLocale();
  const user = useSupabaseUser();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  // undefined = still loading; keeps the "no orders yet" copy from flashing.
  const [orders, setOrders] = useState<OrderRow[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getSupabaseClient()
      .from("orders")
      .select("id, status, payment_method, payment_status, total, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setOrders((data as OrderRow[] | null) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function handleGoogle() {
    setError(null);
    const { error } = await getSupabaseClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
    if (error) setError(t("googleNotConfigured"));
  }

  async function handleEmailAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const supabase = getSupabaseClient();

    try {
      const { data, error } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              // Without this the confirmation link lands on the project's
              // default Site URL instead of back on this locale's account page.
              options: { emailRedirectTo: `${window.location.origin}/${locale}/account` },
            });

      if (error) setError(t(authErrorKey(error)));
      // With email confirmation on, sign-up succeeds without a session.
      else if (mode === "signup" && !data.session) {
        setInfo(t("checkEmail"));
        setMode("signin");
      }
    } catch {
      setError(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await getSupabaseClient().auth.signOut();
    setOrders(undefined);
  }

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (user) {
    const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-12 md:px-10 md:py-16 flex flex-col gap-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl">{t("welcomeBack")}</h1>
            <p className="truncate text-sm text-[var(--color-text-muted)]" dir="ltr">
              {user.email}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleSignOut}>
            <LogOut className="size-3.5 rtl:-scale-x-100" />
            {t("signOut")}
          </Button>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg">{t("orderHistoryTitle")}</h2>
          {orders === undefined ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-[var(--color-text-muted)]" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-dashed border-[var(--color-border)] px-6 py-12 text-center">
              <Package className="size-8 text-[var(--color-text-muted)]" />
              <p className="max-w-[40ch] text-sm text-[var(--color-text-muted)]">
                {t("orderHistoryEmpty")}
              </p>
              <Button asChild variant="primary" size="sm">
                <Link href="/franchises">
                  {checkoutT("shop")}
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-[var(--color-border)] divide-y-[length:var(--border-width)] divide-[var(--color-border)]">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-[var(--color-surface)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Package className="size-4 shrink-0 text-[var(--color-text-muted)]" />
                      <div className="min-w-0">
                        <p className="text-sm font-heading font-[var(--font-heading-weight)]">
                          <span dir="ltr" className="font-mono">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="ms-2 font-body font-normal text-[var(--color-text-muted)]">
                            {dateFmt.format(new Date(order.created_at))}
                          </span>
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                          <span
                            className={`rounded-[var(--radius-full)] border px-2 py-0.5 ${statusPillClass[order.status] ?? ""}`}
                          >
                            {statusT(order.status)}
                          </span>
                          {order.payment_method === "fib" && order.payment_status
                            ? paymentStatusT(order.payment_status)
                            : checkoutT("cashOnDelivery")}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <PriceTag value={order.total} className="text-sm" />
                      <ChevronRight className="size-4 text-[var(--color-text-muted)] rtl:-scale-x-100" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  const isSignup = mode === "signup";

  return (
    <div className="grid md:grid-cols-2 min-h-[70vh]">
      <div className="flex flex-col justify-center gap-6 px-4 py-12 md:px-16 md:py-16">
        <div className="mx-auto flex w-full max-w-[420px] flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl">{isSignup ? t("signUpTitle") : t("signInTitle")}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {isSignup ? t("signUpSubtitle") : t("signInSubtitle")}
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full justify-center"
            onClick={handleGoogle}
          >
            <GoogleIcon />
            {t("continueWithGoogle")}
          </Button>

          <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
            <span className="h-px flex-1 bg-[var(--color-border)]" />
            {t("orSeparator")}
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleEmailAuth}>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs text-[var(--color-text-muted)]">{t("email")}</span>
              <input
                name="email"
                type="email"
                required
                dir="ltr"
                autoComplete="email"
                inputMode="email"
                aria-invalid={error ? true : undefined}
                className={`${inputClass} rtl:text-right`}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs text-[var(--color-text-muted)]">{t("password")}</span>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                dir="ltr"
                autoComplete={isSignup ? "new-password" : "current-password"}
                aria-invalid={error ? true : undefined}
                className={`${inputClass} rtl:text-right`}
              />
              {isSignup && (
                <span className="text-xs text-[var(--color-text-muted)]">{t("passwordHint")}</span>
              )}
            </label>
            {error && (
              <p role="alert" className="text-sm text-[var(--color-accent)]">
                {error}
              </p>
            )}
            {info && (
              <p role="status" className="text-sm text-[var(--color-accent-secondary)]">
                {info}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full justify-center mt-2" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {isSignup ? t("createAccountCta") : t("signIn")}
            </Button>
          </form>

          <p className="text-sm text-[var(--color-text-muted)]">
            {isSignup ? t("haveAccount") : t("noAccount")}{" "}
            <button
              type="button"
              className="text-[var(--color-accent)] underline-offset-2 hover:underline cursor-pointer"
              onClick={() => switchMode(isSignup ? "signin" : "signup")}
            >
              {isSignup ? t("signIn") : t("createAccount")}
            </button>
          </p>
        </div>
      </div>
      <div
        className="hidden md:block"
        style={{ background: "var(--gradient-primary)" }}
        aria-hidden
      />
    </div>
  );
}
