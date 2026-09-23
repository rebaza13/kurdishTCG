"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Franchise } from "@tcg/types";

// Placeholder pack art — not tied to live inventory yet. The centre pack is
// the one that rips; the outer two are sealed dressing that clears out of the
// way on burst.
const SIDE_PACKS = [
  { src: "/packs/pokemon-30th-celebration.png", alt: "Pokémon 30th Celebration booster pack", side: "start" as const },
  { src: "/packs/pokemon-perfect-order.png", alt: "Pokémon Mega Evolution Perfect Order booster pack", side: "end" as const },
];
const HERO_PACK = {
  src: "/packs/riftbound-vendetta.png",
  alt: "Riftbound: League of Legends Vendetta booster pack",
};

// Jagged foil tear, generated once so both halves share an exact edge: the
// top strip is clipped above the zigzag, the pack body below it.
const TEETH = 22;
const TEAR_Y = 15.5;
const TEAR_AMP = 1.4;
const TEAR_PTS = Array.from({ length: TEETH + 1 }, (_, i) => {
  const x = (i / TEETH) * 100;
  const y = TEAR_Y + (i % 2 ? TEAR_AMP : -TEAR_AMP);
  return `${x.toFixed(2)}% ${y.toFixed(2)}%`;
});
const CLIP_TOP = `polygon(0% 0%, 100% 0%, ${[...TEAR_PTS].reverse().join(", ")})`;
const CLIP_BODY = `polygon(${TEAR_PTS.join(", ")}, 100% 100%, 0% 100%)`;

const DRAG_PX = 165; // pointer travel for a full rip
const COMMIT_AT = 0.5; // release past this and it finishes on its own

type Phase = "sealed" | "tearing" | "revealed";

type Fleck = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
  decay: number;
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Franchise accents arrive as `var(--color-riftbound)`, which canvas can't
// parse — it silently falls back to black. Resolve against the live theme so
// the flecks also recolour when the Neon Vault palette takes over.
function resolveColor(value: string) {
  const name = value.match(/^var\((--[\w-]+)\)$/)?.[1];
  if (!name) return value;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#ffffff";
}

export function PackRipHero({ franchises, caption }: { franchises: Franchise[]; caption: string }) {
  const t = useTranslations("home");
  const stageRef = useRef<HTMLDivElement>(null);
  const packRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [phase, setPhase] = useState<Phase>("sealed");
  const phaseRef = useRef<Phase>("sealed");
  const progress = useRef(0);
  const dragging = useRef(false);
  const startX = useRef(0);
  const moved = useRef(0);
  const raf = useRef(0);
  const flecks = useRef<Fleck[]>([]);

  const cards = franchises.slice(0, 6);

  const setPhaseBoth = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const setTear = useCallback((p: number) => {
    progress.current = p;
    stageRef.current?.style.setProperty("--tear", p.toFixed(3));
  }, []);

  // Foil flecks shed from the tear line. Canvas rather than DOM nodes so a
  // couple hundred of them cost one paint instead of one layout each.
  const spawnFlecks = useCallback(() => {
    const stage = stageRef.current;
    const pack = packRef.current;
    const canvas = canvasRef.current;
    if (!stage || !pack || !canvas) return;

    const stageRect = stage.getBoundingClientRect();
    const packRect = pack.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = stageRect.width * dpr;
    canvas.height = stageRect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const originX = packRect.left - stageRect.left + packRect.width / 2;
    const originY = packRect.top - stageRect.top + packRect.height * (TEAR_Y / 100);
    const palette = [...cards.map((c) => resolveColor(c.accent)), "#ffffff", "#ffd76a"];

    for (let i = 0; i < 170; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.35;
      const speed = 3 + Math.random() * 11;
      flecks.current.push({
        x: originX + (Math.random() - 0.5) * packRect.width * 0.85,
        y: originY + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        color: palette[(Math.random() * palette.length) | 0],
        life: 1,
        decay: 0.006 + Math.random() * 0.012,
      });
    }

    cancelAnimationFrame(raf.current);
    const tick = () => {
      ctx.clearRect(0, 0, stageRect.width, stageRect.height);
      let alive = false;
      for (const f of flecks.current) {
        if (f.life <= 0) continue;
        alive = true;
        f.vy += 0.32; // gravity
        f.vx *= 0.986; // air drag
        f.vy *= 0.986;
        f.x += f.vx;
        f.y += f.vy;
        f.rot += f.vr;
        f.life -= f.decay;

        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.globalAlpha = Math.max(f.life, 0);
        ctx.fillStyle = f.color;
        // Squash on rotation so each fleck reads as tumbling foil, not a dot.
        ctx.fillRect(-f.size / 2, -f.size / 4, f.size, f.size * (0.35 + Math.abs(Math.cos(f.rot)) * 0.65));
        ctx.restore();
      }
      if (alive) {
        raf.current = requestAnimationFrame(tick);
      } else {
        flecks.current = [];
        ctx.clearRect(0, 0, stageRect.width, stageRect.height);
      }
    };
    raf.current = requestAnimationFrame(tick);
  }, [cards]);

  const finish = useCallback(() => {
    if (phaseRef.current === "revealed") return;
    setTear(1);
    setPhaseBoth("revealed");
    if (!prefersReducedMotion()) spawnFlecks();
  }, [setTear, setPhaseBoth, spawnFlecks]);

  // Tap/keyboard path: run the tear itself so the burst still reads as a rip
  // rather than a cut.
  const autoRip = useCallback(() => {
    if (phaseRef.current === "revealed") return;
    if (prefersReducedMotion()) {
      finish();
      return;
    }
    setPhaseBoth("tearing");
    const from = progress.current;
    const start = performance.now();
    const dur = 420 * (1 - from);
    cancelAnimationFrame(raf.current);
    const step = (now: number) => {
      const k = Math.min((now - start) / dur, 1);
      setTear(from + (1 - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf.current = requestAnimationFrame(step);
      else finish();
    };
    raf.current = requestAnimationFrame(step);
  }, [setTear, setPhaseBoth, finish]);

  const springBack = useCallback(() => {
    const from = progress.current;
    const start = performance.now();
    cancelAnimationFrame(raf.current);
    const step = (now: number) => {
      const k = Math.min((now - start) / 320, 1);
      setTear(from * (1 - (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf.current = requestAnimationFrame(step);
      else setPhaseBoth("sealed");
    };
    raf.current = requestAnimationFrame(step);
  }, [setTear, setPhaseBoth]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (phaseRef.current === "revealed") return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragging.current = true;
      startX.current = e.clientX;
      moved.current = 0;
      cancelAnimationFrame(raf.current);
      setPhaseBoth("tearing");
    },
    [setPhaseBoth]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      // Absolute distance, so the gesture works pulling either way — which
      // also keeps it natural in the RTL locales.
      const dx = Math.abs(e.clientX - startX.current);
      moved.current = Math.max(moved.current, dx);
      const p = Math.min(dx / DRAG_PX, 1);
      setTear(p);
      if (p >= 1) {
        dragging.current = false;
        finish();
      }
    },
    [setTear, finish]
  );

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (moved.current < 8) autoRip();
    else if (progress.current >= COMMIT_AT) autoRip();
    else springBack();
  }, [autoRip, springBack]);

  const reset = useCallback(() => {
    cancelAnimationFrame(raf.current);
    flecks.current = [];
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTear(0);
    setPhaseBoth("sealed");
  }, [setTear, setPhaseBoth]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const hint =
    phase === "revealed" ? t("ripRevealed") : phase === "tearing" ? t("ripPulling") : t("ripHint");

  return (
    <div ref={stageRef} className="rip" data-phase={phase}>
      <canvas ref={canvasRef} className="rip__flecks" aria-hidden />
      <div className="rip__flash" aria-hidden />

      <div className="rip__scene">
        {SIDE_PACKS.map((p) => (
          <div key={p.src} className="rip__side" data-side={p.side} aria-hidden>
            <Image src={p.src} alt="" fill sizes="(max-width: 768px) 30vw, 180px" className="object-contain" />
          </div>
        ))}

        <div
          ref={packRef}
          className="rip__pack"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Idle float lives on its own element so pausing it during a drag
              can't also freeze the pack's entrance animation. */}
          <div className="rip__float">
            <div className="rip__leak" aria-hidden />

            <div className="rip__body" style={{ clipPath: CLIP_BODY }}>
              <Image src={HERO_PACK.src} alt={HERO_PACK.alt} fill sizes="(max-width: 768px) 46vw, 230px" className="object-contain" priority />
            </div>

            <div className="rip__strip" style={{ clipPath: CLIP_TOP }} aria-hidden>
              <Image src={HERO_PACK.src} alt="" fill sizes="(max-width: 768px) 46vw, 230px" className="object-contain" />
            </div>
          </div>

          <button type="button" className="rip__grab" onClick={autoRip} aria-label={t("ripAria")}>
            <span className="rip__grab-line" aria-hidden />
            <span className="rip__grab-tab" aria-hidden>
              <svg viewBox="0 0 24 16" width="20" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 3l5 5-5 5M14 3l5 5-5 5" />
              </svg>
            </span>
          </button>
        </div>

        <div className="rip__pulls">
          {cards.map((f, i) => (
            <Link
              key={f.slug}
              href={`/franchises/${f.slug}`}
              className="rip__card"
              data-hit={i === 2 ? "" : undefined}
              style={
                {
                  "--i": i,
                  "--off": i - (cards.length - 1) / 2,
                  "--accent": f.accent,
                } as React.CSSProperties
              }
              tabIndex={phase === "revealed" ? undefined : -1}
              aria-hidden={phase === "revealed" ? undefined : true}
            >
              <span className="rip__card-art">
                <Image src={f.image} alt="" fill sizes="150px" className="object-cover" />
              </span>
              <span className="rip__card-foil" aria-hidden />
              <span className="rip__card-name">{f.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="rip__hud">
        <span className="rip__hint" aria-live="polite">
          {hint}
        </span>
        <span className="rip__caption">{caption}</span>
        {phase === "revealed" && (
          <button type="button" className="rip__again" onClick={reset}>
            {t("ripAgain")}
          </button>
        )}
      </div>
    </div>
  );
}
