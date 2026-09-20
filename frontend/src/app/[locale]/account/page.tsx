"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { User } from "@supabase/supabase-js";
import { Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/price-tag";
import { getSupabaseClient } from "@/lib/supabase/client";

type OrderRow = {
  id: string;
  status: string;
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

export default function AccountPage() {
  const t = useTranslations("account");
  const statusT = useTranslations("orderStatus");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    supabase
      .from("orders")
      .select("id, status, total, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as OrderRow[]) ?? []));
  }, [user]);

  async function handleGoogle() {
    setError(null);
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
    if (error) setError(t("googleNotConfigured"));
  }

  async function handleEmailAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const supabase = getSupabaseClient();

    const { data, error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) setError(error.message);
    // With email confirmation on, sign-up succeeds without a session.
    else if (mode === "signup" && !data.session) setInfo(t("checkEmail"));
  }

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setOrders([]);
  }

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-16 md:px-10 flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl">{t("welcomeBack")}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">{user.email}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleSignOut}>
            {t("signOut")}
          </Button>
        </div>

        <div>
          <h2 className="text-lg mb-4">{t("orderHistoryTitle")}</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">{t("orderHistoryEmpty")}</p>
          ) : (
            <div className="flex flex-col divide-y-[length:var(--border-width)] divide-[var(--color-border)] border-y-[length:var(--border-width)] border-[var(--color-border)]">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-4 gap-4">
                  <div className="flex items-center gap-3">
                    <Package className="size-4 text-[var(--color-text-muted)]" />
                    <div>
                      <p className="text-sm font-heading font-[var(--font-heading-weight)]">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {statusT(order.status)}
                      </p>
                    </div>
                  </div>
                  <PriceTag value={order.total} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 min-h-[70vh]">
      <div className="flex flex-col justify-center gap-6 px-4 py-16 md:px-16">
        <div className="mx-auto flex w-full max-w-[420px] flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl">{t("signInTitle")}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">{t("signInSubtitle")}</p>
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
                autoComplete="email"
                className="border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 outline-none rounded-[var(--radius-xs)] focus-visible:border-[var(--color-accent)]"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs text-[var(--color-text-muted)]">{t("password")}</span>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 outline-none rounded-[var(--radius-xs)] focus-visible:border-[var(--color-accent)]"
              />
            </label>
            {error && <p className="text-sm text-[var(--color-accent)]">{error}</p>}
            {info && <p className="text-sm text-[var(--color-accent-secondary)]">{info}</p>}
            <Button type="submit" size="lg" className="w-full justify-center mt-2" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "signin" ? t("signIn") : t("createAccount")}
            </Button>
          </form>

          <p className="text-sm text-[var(--color-text-muted)]">
            {mode === "signin" ? (
              <>
                {t("noAccount")}{" "}
                <button
                  type="button"
                  className="text-[var(--color-accent)] underline-offset-2 hover:underline cursor-pointer"
                  onClick={() => setMode("signup")}
                >
                  {t("createAccount")}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="text-[var(--color-accent)] underline-offset-2 hover:underline cursor-pointer"
                onClick={() => setMode("signin")}
              >
                {t("signIn")}
              </button>
            )}
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
