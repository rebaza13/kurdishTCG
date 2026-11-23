"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CityMap } from "@/components/map/city-map";
import { getSupabaseClient } from "@/lib/supabase/client";
import { normalizeIraqiMobile } from "@/lib/phone";
import type { CityCode } from "@/lib/iraq-cities";
import type { ContactChannel, SellerProfile } from "@/lib/market";

/**
 * The one-time "who are you and where do you ship from" form a seller fills
 * before their first listing (and edits later in Sell → Seller profile).
 */
export function SellerProfileForm({
  userId,
  initial,
  onSaved,
  submitLabel,
}: {
  userId: string;
  initial?: SellerProfile | null;
  onSaved: (profile: SellerProfile) => void;
  submitLabel: string;
}) {
  const t = useTranslations("seller");
  const marketT = useTranslations("market");
  const locale = useLocale();
  const [city, setCity] = useState<CityCode | null>(initial?.city ?? null);
  const [channel, setChannel] = useState<ContactChannel>(initial?.contact_channel ?? "whatsapp");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState(false);
  const [cityError, setCityError] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    const phone = normalizeIraqiMobile(String(form.get("phone") ?? ""));
    setPhoneError(!phone);
    setCityError(!city);
    if (!phone) {
      (e.currentTarget.elements.namedItem("phone") as HTMLInputElement | null)?.focus();
      return;
    }
    if (!city) {
      setError(t("cityRequired"));
      return;
    }
    const row = {
      user_id: userId,
      display_name: String(form.get("displayName") ?? "").trim(),
      phone,
      contact_channel: channel,
      city,
      address: String(form.get("address") ?? "").trim(),
      locale,
    };
    setSaving(true);
    const { data, error } = await getSupabaseClient()
      .from("seller_profiles")
      .upsert(row)
      .select("user_id, display_name, phone, contact_channel, city, address")
      .single();
    setSaving(false);
    if (error || !data) {
      setError(t("genericError"));
      return;
    }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2200);
    onSaved(data as SellerProfile);
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">{t("displayName")}</span>
          <input name="displayName" required minLength={2} maxLength={60} defaultValue={initial?.display_name} autoComplete="nickname" className="kt-mk-input" />
          <span className="text-xs text-[var(--color-text-muted)]">{t("displayNameHint")}</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">{t("phone")}</span>
          <input
            name="phone"
            required
            type="tel"
            inputMode="tel"
            dir="ltr"
            autoComplete="tel"
            placeholder="0750 123 4567"
            defaultValue={initial?.phone}
            aria-invalid={phoneError || undefined}
            className="kt-mk-input rtl:text-right"
          />
          <span role={phoneError ? "alert" : undefined} className={`text-xs ${phoneError ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"}`}>
            {phoneError ? marketT("phoneInvalid") : marketT("phoneHint")}
          </span>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-xs font-medium text-[var(--color-text-muted)]">{t("channel")}</legend>
          <div className="grid grid-cols-2 gap-3" role="radiogroup">
            {(
              [
                ["whatsapp", t("channelWhatsapp"), t("channelWhatsappHint"), MessageCircle, "#25d366"],
                ["viber", t("channelViber"), t("channelViberHint"), Phone, "#7360f2"],
              ] as const
            ).map(([value, label, hint, Icon, color]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={channel === value}
                onClick={() => setChannel(value)}
                className="kt-mk-choice"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <span className="grid size-7 place-items-center rounded-full text-white" style={{ background: color }}>
                    <Icon className="size-3.5" strokeWidth={2.5} />
                  </span>
                  {label}
                  {channel === value && <Check className="ms-auto size-4 text-[var(--color-accent)]" strokeWidth={3} />}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">{t("address")}</span>
          <input name="address" required minLength={3} maxLength={300} defaultValue={initial?.address} autoComplete="street-address" placeholder={marketT("addressPlaceholder")} className="kt-mk-input" />
          <span className="text-xs text-[var(--color-text-muted)]">{t("addressHint")}</span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-[var(--color-accent)]">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="justify-center" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : savedFlash ? <Check className="size-4" /> : null}
          {savedFlash ? t("saved") : submitLabel}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">
          {t("city")} · {t("cityHint")}
        </span>
        <CityMap
          value={city}
          invalid={cityError}
          onChange={(c) => {
            setCity(c);
            setCityError(false);
            if (error === t("cityRequired")) setError(null);
          }}
        />
      </div>
    </form>
  );
}
