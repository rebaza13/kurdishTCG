"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function Footer() {
  const t = useTranslations("footer");
  const meta = useTranslations("meta");
  const nav = useTranslations("nav");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <footer className="border-t-[length:var(--border-width)] border-[var(--color-border-strong)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-[1440px] px-4 py-14 md:px-10 grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <span className="text-lg font-heading font-[var(--font-heading-weight)]">
            {meta("siteName")}
          </span>
          <p className="text-sm text-[var(--color-text-muted)] max-w-[40ch]">
            {meta("tagline")}
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <span className="font-heading font-[var(--font-heading-weight)] text-sm">
              {t("newsletterTitle")}
            </span>
            <p className="text-xs text-[var(--color-text-muted)] max-w-[38ch]">
              {t("newsletterBody")}
            </p>
            {submitted ? (
              <p className="text-xs text-[var(--color-accent)]">
                {"✓"} {t("newsletterCta")}
              </p>
            ) : (
              <form
                className="flex gap-2 max-w-[340px]"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!email.trim()) return;
                  // Lazy-load the Supabase SDK only when someone actually
                  // submits — keeps it out of the initial bundle for every
                  // page, since Footer renders globally.
                  const { getSupabaseClient } = await import("@/lib/supabase/client");
                  const supabase = getSupabaseClient();
                  const { error } = await supabase
                    .from("newsletter_signups")
                    .upsert({ email: email.trim() }, { onConflict: "email", ignoreDuplicates: true });
                  if (!error) setSubmitted(true);
                }}
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("newsletterPlaceholder")}
                  className="min-w-0 flex-1 border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs outline-none rounded-[var(--radius-xs)]"
                />
                <Button type="submit" size="sm" variant="primary">
                  {t("newsletterCta")}
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <span className="font-heading font-[var(--font-heading-weight)] text-xs uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
            {t("shop")}
          </span>
          <Link href="/franchises" className="hover:text-[var(--color-accent)]">
            {nav("franchises")}
          </Link>
          <Link href="/franchises?sort=newest" className="hover:text-[var(--color-accent)]">
            {nav("newArrivals")}
          </Link>
          <Link href="/sell" className="hover:text-[var(--color-accent)]">
            {nav("sellToUs")}
          </Link>
          <Link href="/cart" className="hover:text-[var(--color-accent)]">
            {nav("cart")}
          </Link>
          <Link href="/account" className="hover:text-[var(--color-accent)]">
            {nav("account")}
          </Link>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <span className="font-heading font-[var(--font-heading-weight)] text-xs uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
            {t("company")}
          </span>
          <Link href="/about" className="hover:text-[var(--color-accent)]">
            {t("about")}
          </Link>
          <Link href="/contact" className="hover:text-[var(--color-accent)]">
            {t("contact")}
          </Link>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <span className="font-heading font-[var(--font-heading-weight)] text-xs uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
            {t("support")}
          </span>
          <Link href="/shipping" className="hover:text-[var(--color-accent)]">
            {t("shippingInfo")}
          </Link>
          <Link href="/returns" className="hover:text-[var(--color-accent)]">
            {t("returns")}
          </Link>
          <Link href="/faq" className="hover:text-[var(--color-accent)]">
            {t("faq")}
          </Link>
        </div>
      </div>
      <div className="hr" />
      <div className="mx-auto max-w-[1440px] px-4 py-5 md:px-10 text-xs text-[var(--color-text-muted)]">
        © {new Date().getFullYear()} {meta("siteName")}. {t("rights")}
      </div>
    </footer>
  );
}
