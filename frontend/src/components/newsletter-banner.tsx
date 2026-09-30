"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useScrollReveal } from "@/lib/use-scroll-reveal";

export function NewsletterBanner({ images }: { images: string[] }) {
  const t = useTranslations("footer");
  const homeT = useTranslations("home");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const reveal = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={reveal.ref}
      data-reveal={reveal["data-reveal"]}
      className="relative flex min-h-[340px] flex-col justify-center overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-accent)] px-6 py-10 text-white sm:px-10 md:px-14 md:py-16"
    >
      {images[0] && (
        <Image
          src={images[0]}
          alt=""
          width={250}
          height={350}
          aria-hidden
          className="pointer-events-none absolute top-1/2 hidden object-contain drop-shadow-[0_30px_30px_rgba(0,0,0,0.35)] sm:block"
          style={{ insetInlineEnd: "clamp(-40px,2vw,120px)", width: "clamp(150px,18vw,250px)", transform: "translateY(-50%) rotate(14deg)" }}
        />
      )}
      {images[1] && (
        <Image
          src={images[1]}
          alt=""
          width={200}
          height={280}
          aria-hidden
          className="pointer-events-none absolute top-[58%] hidden object-contain drop-shadow-[0_30px_30px_rgba(0,0,0,0.35)] sm:block"
          style={{ insetInlineEnd: "clamp(80px,17vw,330px)", width: "clamp(120px,14vw,200px)", transform: "translateY(-50%) rotate(-12deg)" }}
        />
      )}
      <div className="relative flex max-w-[620px] flex-col gap-4">
        <span className="font-mono text-xs font-bold tracking-[0.14em]">{homeT("newsletterKicker")}</span>
        <h2 className="text-4xl leading-[0.92] md:text-6xl">{t("newsletterTitle")}</h2>
        <p className="max-w-[40ch] text-lg leading-snug">{t("newsletterBody")}</p>
        {submitted ? (
          <p className="mt-1.5 text-base font-medium">✓ {t("newsletterCta")}</p>
        ) : (
          <form
            className="mt-1.5 flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email.trim()) return;
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
              className="h-14 min-w-0 flex-1 basis-[220px] rounded-[var(--radius-full)] border-[1.5px] border-white/55 bg-white/10 px-5 text-base text-white outline-none placeholder:text-white/70"
            />
            <button
              type="submit"
              className="h-14 cursor-pointer rounded-[var(--radius-full)] bg-[var(--color-text)] px-7 font-heading text-base font-[var(--font-heading-weight)] text-[var(--color-bg)] transition-transform hover:-translate-y-0.5"
            >
              {t("newsletterCta")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
