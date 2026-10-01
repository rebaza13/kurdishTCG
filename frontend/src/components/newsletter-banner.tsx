"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/reveal";

export function NewsletterBanner() {
  const t = useTranslations("footer");
  const home = useTranslations("home");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="kt-newsletter">
      <Reveal className="kt-newsletter__panel">
        <Image
          src="/packs/riftbound-vendetta.png"
          alt=""
          width={250}
          height={406}
          aria-hidden
          className="kt-newsletter__pack"
          style={{ right: "clamp(-60px,2vw,120px)", top: "50%", width: "clamp(150px,18vw,250px)", height: "auto", transform: "translateY(-50%) rotate(14deg)" }}
        />
        <Image
          src="/packs/pokemon-30th-celebration.png"
          alt=""
          width={200}
          height={325}
          aria-hidden
          className="kt-newsletter__pack"
          style={{ right: "clamp(80px,17vw,330px)", top: "58%", width: "clamp(120px,14vw,200px)", height: "auto", transform: "translateY(-50%) rotate(-12deg)" }}
        />
        <div className="kt-newsletter__content">
          <span className="kt-newsletter__eyebrow">{home("newsletterEyebrowNumbered")}</span>
          <h2 className="kt-newsletter__title">{t("newsletterTitle")}</h2>
          <p className="kt-newsletter__body">{t("newsletterBody")}</p>
          <form
            className="kt-newsletter__form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email.trim() || submitted) return;
              const { getSupabaseClient } = await import("@/lib/supabase/client");
              const supabase = getSupabaseClient();
              const { error } = await supabase
                .from("newsletter_signups")
                .upsert({ email: email.trim() }, { onConflict: "email", ignoreDuplicates: true });
              if (!error) setSubmitted(true);
            }}
          >
            <input
              className="kt-newsletter__input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("newsletterPlaceholder")}
              disabled={submitted}
            />
            <button type="submit" className="kt-newsletter__submit" disabled={submitted}>
              {submitted ? `✓ ${t("newsletterCta")}` : t("newsletterCta")}
            </button>
          </form>
        </div>
      </Reveal>
    </section>
  );
}
