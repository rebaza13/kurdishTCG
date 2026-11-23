"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SellerProfileForm } from "@/components/market/seller-profile-form";
import { ListingForm } from "@/components/market/listing-form";
import { SignInPrompt } from "@/components/market/sign-in-prompt";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/use-supabase-user";
import type { SellerProfile } from "@/lib/market";

/** Seller details first (once), then the listing itself. */
export function NewListingFlow({ franchises }: { franchises: { slug: string; name: string }[] }) {
  const t = useTranslations("seller");
  const user = useSupabaseUser();
  const [profile, setProfile] = useState<SellerProfile | null | undefined>(undefined);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    getSupabaseClient()
      .from("seller_profiles")
      .select("user_id, display_name, phone, contact_channel, city, address")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => setProfile((data as SellerProfile | null) ?? null));
  }, [userId]);

  if (user === null) return <SignInPrompt />;
  if (user === undefined || profile === undefined) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  const step = profile ? 2 : 1;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-10 md:py-12 flex flex-col gap-8">
      <Link href="/sell" className="inline-flex items-center gap-2 self-start text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
        <ArrowLeft className="size-4 rtl:-scale-x-100" />
        {t("back_")}
      </Link>

      <ol className="flex items-center gap-3 text-sm" aria-label={t("newListing")}>
        {[t("stepProfile"), t("stepListing")].map((label, i) => (
          <li key={label} className="flex items-center gap-3">
            {i > 0 && <span className="h-px w-8 bg-[var(--color-border)]" aria-hidden />}
            <span
              className={`grid size-7 place-items-center rounded-full font-mono text-xs ${
                step > i ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "bg-[var(--color-chip)] text-[var(--color-text-muted)]"
              }`}
            >
              {i + 1}
            </span>
            <span aria-current={step === i + 1 ? "step" : undefined} className={step === i + 1 ? "font-semibold" : "text-[var(--color-text-muted)]"}>
              {label}
            </span>
          </li>
        ))}
      </ol>

      {profile ? (
        <>
          <h1 className="text-3xl md:text-5xl">{t("newListing")}</h1>
          <ListingForm userId={user.id} profile={profile} franchises={franchises} />
        </>
      ) : (
        <>
          <div className="flex max-w-[62ch] flex-col gap-2">
            <h1 className="text-3xl md:text-5xl">{t("profileTitle")}</h1>
            <p className="text-[var(--color-text-muted)]">{t("profileBody")}</p>
          </div>
          <SellerProfileForm userId={user.id} onSaved={setProfile} submitLabel={t("saveProfile")} />
        </>
      )}
    </div>
  );
}
