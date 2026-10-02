"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Franchise } from "@tcg/types";

// The three packs on the stage — same local art whichever franchises are
// live, since this is a demo rip, not a real per-SKU unboxing.
const SIDE_PACKS = [
  { src: "/packs/pokemon-30th-celebration.png", alt: "Pokémon 30th Celebration booster pack", dir: -1 },
  { src: "/packs/pokemon-perfect-order.png", alt: "Pokémon Mega Evolution Perfect Order booster pack", dir: 1 },
] as const;
const HERO_PACK = {
  src: "/packs/riftbound-vendetta.png",
  alt: "Riftbound: League of Legends Vendetta booster pack",
};

type Twinkle = { top?: string; bottom?: string; left?: string; right?: string; size: number; color: string; delay: string; dur: string };
const TWINKLES: Twinkle[] = [
  { top: "20%", left: "14%", size: 14, color: "var(--color-accent)", delay: "0s", dur: "2.4s" },
  { top: "14%", right: "16%", size: 9, color: "var(--color-text)", delay: "0.6s", dur: "3s" },
  { bottom: "26%", right: "11%", size: 16, color: "#d4a106", delay: "1.1s", dur: "2.7s" },
  { bottom: "20%", left: "10%", size: 10, color: "#2f5bea", delay: "0.3s", dur: "3.2s" },
];

// Five burst positions (x offset unit, y px, rotation deg) — index 2 is the
// hit: dead centre, bigger, ringed and glowing.
const BURST_POS: Array<[number, number, number]> = [
  [-2, 40, -20],
  [-1, 4, -10],
  [0, -18, 0],
  [1, 4, 10],
  [2, 40, 20],
];
const RARITY_COMMON = ["common", "uncommon", "rare", "common"] as const;
const RARITY_HIT = ["secret", "ultra", "holo"] as const;

type Phase = "idle" | "shaking" | "open";

/** 2π·88 — the stage ring's text path radius in its 200×200 viewBox. */
const RING_CIRCUMFERENCE = 552;
type BurstCard = { franchise: Franchise; hit: boolean; rarityKey: string; transform: string; z: number; delay: number };

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function PackRipHero({ franchises }: { franchises: Franchise[] }) {
  const t = useTranslations("home");
  const rarityT = useTranslations("rarity");
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [phase, setPhase] = useState<Phase>("idle");
  const [burst, setBurst] = useState<BurstCard[]>([]);
  const [pulled, setPulled] = useState<{ rarityKey: string; name: string } | null>(null);

  // Ring text: measure one copy, then repeat it as many whole times as fit
  // the circle and stretch to the exact circumference — the loop closes
  // cleanly in every locale without visibly spacing out Arabic script.
  const ringText = t("stageRing");
  const ringRef = useRef<SVGTextPathElement>(null);
  useEffect(() => {
    const el = ringRef.current;
    if (!el) return;
    el.removeAttribute("textLength");
    el.textContent = ringText;
    const one = el.getComputedTextLength();
    const repeat = one > 0 ? Math.max(1, Math.round(RING_CIRCUMFERENCE / one)) : 2;
    el.textContent = ringText.repeat(repeat);
    el.setAttribute("textLength", String(RING_CIRCUMFERENCE));
  }, [ringText]);

  const cards = useMemo(() => franchises.slice(0, 6), [franchises]);
  const open = phase === "open";

  const rip = useCallback(() => {
    if (phase !== "idle" || cards.length === 0) return;
    setPhase("shaking");
    const run = () => {
      const stageW = stageRef.current?.offsetWidth ?? 600;
      const spread = Math.min(stageW * 0.19, 130);
      const shuffled = [...cards].sort(() => Math.random() - 0.5);
      const hitRarity = RARITY_HIT[Math.floor(Math.random() * RARITY_HIT.length)];
      const next: BurstCard[] = BURST_POS.map(([x, y, r], i) => {
        const f = shuffled[i % shuffled.length];
        const hit = i === 2;
        return {
          franchise: f,
          hit,
          rarityKey: hit ? hitRarity : RARITY_COMMON[i > 2 ? i - 1 : i],
          z: hit ? 7 : 6 - Math.abs(x),
          transform: `translate(-50%,-50%) translate(${x * spread}px,${y}px) rotate(${r}deg) scale(${hit ? 1.14 : 1})`,
          delay: i * 0.07,
        };
      });
      setBurst(next);
      setPulled({ rarityKey: hitRarity, name: shuffled[2].name });
      setPhase("open");
    };
    if (prefersReducedMotion()) run();
    else shakeTimer.current = setTimeout(run, 650);
  }, [phase, cards]);

  const reseal = useCallback(() => {
    clearTimeout(shakeTimer.current);
    setPhase("idle");
    setBurst([]);
    setPulled(null);
  }, []);

  useEffect(() => () => clearTimeout(shakeTimer.current), []);

  const onStageMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!tiltRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5;
    const dy = (e.clientY - r.top) / r.height - 0.5;
    tiltRef.current.style.transform = `perspective(1100px) rotateY(${dx * 16}deg) rotateX(${-dy * 12}deg)`;
  }, []);
  const onStageLeave = useCallback(() => {
    if (tiltRef.current) tiltRef.current.style.transform = "";
  }, []);

  const centerAnim =
    phase === "idle"
      ? "kt-float 5s ease-in-out infinite"
      : phase === "shaking"
        ? "kt-shake 0.65s ease-in-out both"
        : "kt-pack-away 0.6s ease-in forwards";

  return (
    <section className="kt-hero">
      <div className="kt-hero__copy">
        <div className="kt-hero__kicker">
          <span className="kt-hero__kicker-dot" aria-hidden />
          <span>{t("heroKicker")}</span>
        </div>
        <h1 className="kt-hero__title">
          <span>{t("heroLine1")}</span>
          <span>{t("heroLine2")}</span>
          <span className="kt-hero__title-pull">
            <span className="kt-hero__title-accent">{t("heroLine3Highlight")}</span>
            <span className="kt-hero__foil-chip" aria-hidden>
              <span />
            </span>
          </span>
        </h1>
        <p className="kt-hero__desc">{t("heroTitleSecondaryAll")}</p>
        <div className="kt-hero__chips">
          {cards.map((f) => (
            <Link key={f.slug} href={`/franchises/${f.slug}`} className="kt-hero__chip">
              <span className="kt-hero__chip-swatch" style={{ background: f.accent }} aria-hidden />
              <span>{f.name}</span>
            </Link>
          ))}
        </div>
        <div className="kt-hero__ctas">
          <Link href="/search" className="kt-btn-primary">
            <span>{t("shopNow")}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <Link href="/franchises" className="kt-btn-outline">
            {t("browseFranchises")}
          </Link>
        </div>
      </div>

      <div className="kt-hero__stage-wrap">
        <div ref={stageRef} className="kt-stage" onMouseMove={onStageMove} onMouseLeave={onStageLeave}>
          <div className="kt-stage__grid" aria-hidden />
          <div className="kt-stage__disc" aria-hidden />
          <div className="kt-stage__ring" aria-hidden>
            <svg viewBox="0 0 200 200">
              <defs>
                <path id="kt-ring-path" d="M100,100 m-88,0 a88,88 0 1,1 176,0 a88,88 0 1,1 -176,0" />
              </defs>
              <text fill="currentColor">
                <textPath ref={ringRef} href="#kt-ring-path" lengthAdjust="spacing">
                  {ringText}
                </textPath>
              </text>
            </svg>
          </div>
          {TWINKLES.map((tw, i) => (
            <span
              key={i}
              className="kt-twinkle"
              aria-hidden
              style={{
                top: tw.top,
                left: tw.left,
                right: tw.right,
                bottom: tw.bottom,
                width: tw.size,
                height: tw.size,
                background: tw.color,
                animationDelay: tw.delay,
                animationDuration: tw.dur,
              }}
            />
          ))}

          <div ref={tiltRef} className="kt-tilt">
            {SIDE_PACKS.map((p) => (
              <div
                key={p.src}
                className="kt-pack-side"
                style={{
                  transform: `translate(-50%,-50%) translateX(${p.dir * (open ? 115 : 68)}%) rotate(${p.dir * (open ? 24 : 13)}deg)`,
                  opacity: open ? 0.35 : 1,
                }}
              >
                <div className="kt-pack-side__float">
                  <Image src={p.src} alt={p.alt} fill sizes="(max-width: 480px) 34vw, 230px" className="object-contain" loading="eager" />
                </div>
              </div>
            ))}

            <button type="button" className="kt-pack-center" onClick={rip} disabled={cards.length === 0} aria-label={t("ripAria")}>
              <div className="kt-pack-center__inner" style={{ animation: centerAnim }}>
                <Image src={HERO_PACK.src} alt={HERO_PACK.alt} fill sizes="(max-width: 480px) 42vw, 270px" className="object-contain" fetchPriority="high" loading="eager" />
                <span className="kt-pack-center__sheen" aria-hidden />
              </div>
            </button>

            {open && (
              <>
                <span className="kt-burst-flash" aria-hidden />
                {burst.map((c, i) => (
                  <Link
                    key={`${c.franchise.slug}-${i}`}
                    href={`/franchises/${c.franchise.slug}`}
                    className="kt-burst-card"
                    data-hit={c.hit || undefined}
                    style={{ transform: c.transform, zIndex: c.z, animationDelay: `${c.delay}s` }}
                  >
                    <div className="kt-burst-card__art" style={{ background: c.franchise.accent }}>
                      <Image src={c.franchise.image} alt="" fill sizes="140px" className="object-cover" />
                      <span className="kt-burst-card__sheen" aria-hidden />
                      <span className="kt-burst-card__rarity">{rarityT(c.rarityKey)}</span>
                    </div>
                  </Link>
                ))}
                {pulled && (
                  <div className="kt-pulled-pill">
                    <span className="kt-pulled-pill__rarity">{rarityT(pulled.rarityKey).toUpperCase()}</span>
                    <span>{t("pulledPrefix", { name: pulled.name })}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="kt-stage__foot">
          <span className="kt-stage__hint">{t("ripKicker")}</span>
          <button type="button" className="kt-rip-btn" onClick={open ? reseal : rip} disabled={cards.length === 0 && !open}>
            <span className="kt-rip-btn__dot" aria-hidden />
            <span>{open ? t("ripBtnReseal") : t("ripBtnRip")}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
