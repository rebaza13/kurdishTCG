"use client";

import { useTranslations } from "next-intl";
import { Camera, MessageCircle, Tag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";

/** Selling pitch for signed-out visitors of /sell and /sell/new. */
export function SignInPrompt() {
  const t = useTranslations("seller");
  const accountT = useTranslations("account");

  const steps = [
    [Camera, t("step1")],
    [Tag, t("step2")],
    [MessageCircle, t("step3")],
  ] as const;

  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-12 px-4 py-14 md:px-10 md:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center">
      <div className="flex flex-col gap-5">
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-accent)]">{t("kicker")}</span>
        <h1 className="text-4xl md:text-6xl">{t("title")}</h1>
        <p className="max-w-[52ch] text-[var(--color-text-muted)]">{t("body")}</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            size="lg"
            onClick={() =>
              getSupabaseClient().auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: window.location.href },
              })
            }
          >
            {accountT("continueWithGoogle")}
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/account">{t("signInCta")}</Link>
          </Button>
        </div>
      </div>
      <ol className="flex flex-col gap-3">
        {steps.map(([Icon, label], i) => (
          <li key={label} className="kt-mk-panel reveal flex items-center gap-4 p-5" style={{ animationDelay: `${i * 90}ms` }}>
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-ink)]">
              <Icon className="size-5" />
            </span>
            <span className="font-mono text-xs text-[var(--color-text-muted)]">0{i + 1}</span>
            <span className="font-semibold">{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
