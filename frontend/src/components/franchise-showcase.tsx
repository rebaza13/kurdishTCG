"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PriceTag } from "@/components/price-tag";
import type { Franchise } from "@tcg/types";

/**
 * Desktop-only "six worlds, one shelf" accordion: a row of full-bleed panels
 * that grow on hover to reveal name, badge and a shop CTA. Phone/tablet gets
 * the plain swipeable rail in the homepage instead (see page.tsx).
 */
export function FranchiseShowcase({ franchises }: { franchises: Franchise[] }) {
  const t = useTranslations("franchises");
  const [active, setActive] = useState(0);

  return (
    <div className="hidden md:flex h-[480px] gap-3 xl:h-[520px]">
      {franchises.map((f, i) => {
        const on = i === active;
        return (
          <Link
            key={f.slug}
            href={`/franchises/${f.slug}`}
            onMouseEnter={() => setActive(i)}
            data-active={on}
            className="franchise-panel"
            style={{ background: f.accent }}
          >
            <Image
              src={f.image}
              alt={f.name}
              fill
              sizes="(max-width: 1280px) 30vw, 20vw"
              className="franchise-panel__img object-cover object-top"
              style={{ transform: `scale(${on ? 1.02 : 1.14})` }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: "linear-gradient(0deg, rgba(8,6,4,.86) 0%, rgba(8,6,4,.35) 45%, rgba(8,6,4,0) 70%)" }}
            />
            <span className="absolute inset-x-0 top-0 h-[7px]" style={{ background: f.accent }} aria-hidden />

            {/* Collapsed: name rotated vertically */}
            <span
              className="absolute bottom-7 start-1/2 -translate-x-1/2 whitespace-nowrap text-2xl font-heading font-[var(--font-heading-weight)] tracking-tight transition-opacity duration-300"
              style={{
                writingMode: "vertical-rl",
                transform: "translateX(-50%) rotate(180deg)",
                opacity: on ? 0 : 1,
              }}
            >
              {f.name}
            </span>

            {/* Expanded: full detail block */}
            <div
              className="absolute inset-x-7 bottom-7 flex flex-col items-start gap-3 transition-[opacity,transform] duration-500"
              style={{ opacity: on ? 1 : 0, transform: on ? "translateY(0)" : "translateY(24px)", transitionDelay: on ? "150ms" : "0ms" }}
            >
              <span
                className="whitespace-nowrap rounded-[8px] px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em]"
                style={{ background: f.accent }}
              >
                {f.badge}
              </span>
              <span className="whitespace-nowrap text-[clamp(34px,4vw,54px)] font-heading font-[var(--font-heading-weight)] leading-[0.95] tracking-tight">
                {f.name}
              </span>
              <div className="flex w-full flex-wrap items-center justify-between gap-4">
                <span className="whitespace-nowrap font-mono text-[13px]">
                  {f.cardCount} {t("cards")} · {t("from")} <PriceTag value={f.fromPrice} />
                </span>
                <span className="flex h-[42px] items-center gap-2 whitespace-nowrap rounded-[var(--radius-full)] bg-white px-4.5 font-heading text-sm font-[var(--font-heading-weight)] text-[#17140F]">
                  {t("shop", { name: f.name })} →
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
