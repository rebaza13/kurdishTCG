"use client";

import Image from "next/image";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { franchiseColorVar } from "@/lib/franchise-colors";
import type { Product, Rarity } from "@tcg/types";

const COARSE_QUERY = "(hover: none)";
const MAX_TILT_X = 10;
const MAX_TILT_Y = 14;

function subscribeCoarse(onChange: () => void) {
  const mq = window.matchMedia(COARSE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

type Phase = "idle" | "shaking" | "open";

type BurstCard = {
  product: Product;
  key: number;
  rarity: Rarity;
  transform: string;
  z: number;
  hit: boolean;
};

const BURST_SLOTS: Array<[x: number, y: number, r: number]> = [
  [-2, 42, -20],
  [-1, 6, -10],
  [0, -16, 0],
  [1, 6, 10],
  [2, 42, 20],
];
const COMMON_RARITIES: Rarity[] = ["common", "uncommon", "rare", "common"];
const HIT_RARITIES: Rarity[] = ["secret", "ultra", "holo"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function HeroCardStage({ cards, caption }: { cards: Product[]; caption: string }) {
  const t = useTranslations("home");
  const rarityT = useTranslations("rarity");
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [phase, setPhase] = useState<Phase>("idle");
  const [burst, setBurst] = useState<BurstCard[]>([]);
  const [pulled, setPulled] = useState<{ rarity: Rarity; name: string } | null>(null);
  const [hovering, setHovering] = useState(false);

  const coarse = useSyncExternalStore(
    subscribeCoarse,
    () => window.matchMedia(COARSE_QUERY).matches,
    () => false
  );

  const pool = cards.length > 0 ? cards : [];
  const center = pool[0];
  const left = pool[1] ?? pool[0];
  const right = pool[2] ?? pool[0];

  const onStageMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const tilt = tiltRef.current;
    if (!tilt || e.pointerType === "touch") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - rect.left) / rect.width - 0.5;
    const dy = (e.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      tilt.style.transform = `perspective(1100px) rotateY(${(dx * MAX_TILT_Y).toFixed(2)}deg) rotateX(${(-dy * MAX_TILT_X).toFixed(2)}deg)`;
    });
  }, []);

  const onStageLeave = useCallback(() => {
    setHovering(false);
    cancelAnimationFrame(rafRef.current);
    if (tiltRef.current) tiltRef.current.style.transform = "";
  }, []);

  const rip = useCallback(() => {
    if (phase !== "idle" || !center) return;
    setPhase("shaking");
    timerRef.current = setTimeout(() => {
      const hitRarity = pick(HIT_RARITIES);
      const nextBurst: BurstCard[] = BURST_SLOTS.map(([x, y, r], i) => {
        const hit = i === 2;
        const product = pool[i % pool.length] ?? center;
        return {
          product,
          key: i,
          rarity: hit ? hitRarity : COMMON_RARITIES[i > 2 ? i - 1 : i],
          z: hit ? 7 : 6 - Math.abs(x),
          hit,
          transform: `translate(-50%,-50%) translate(${x * 78}px, ${y}px) rotate(${r}deg) scale(${hit ? 1.14 : 1})`,
        };
      });
      setBurst(nextBurst);
      setPulled({ rarity: hitRarity, name: pool[2 % pool.length]?.name ?? center.name });
      setPhase("open");
    }, 650);
  }, [phase, center, pool]);

  const reseal = useCallback(() => {
    clearTimeout(timerRef.current);
    setPhase("idle");
    setBurst([]);
    setPulled(null);
  }, []);

  const centerAnimation = useMemo(() => {
    if (phase === "shaking") return "pack-shake 0.65s ease-in-out both";
    if (phase === "open") return "pack-away 0.6s ease-in forwards";
    return "float 5s ease-in-out infinite";
  }, [phase]);

  if (!center) return null;

  const open = phase === "open";
  const showInfo = hovering || coarse;

  return (
    <div className="flex flex-col gap-3.5">
      <div
        ref={stageRef}
        className="pack-stage"
        style={{ height: "clamp(420px,44vw,600px)" }}
        onPointerMove={onStageMove}
        onPointerEnter={(e) => e.pointerType !== "touch" && setHovering(true)}
        onPointerLeave={onStageLeave}
      >
        <div className="pack-stage__grid" aria-hidden />
        <div className="pack-stage__disc" aria-hidden />

        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: "48%",
            width: "min(96%,620px)",
            aspectRatio: 1,
            transform: "translate(-50%,-50%)",
          }}
        >
          <svg
            viewBox="0 0 200 200"
            className="animate-spin-slow"
            style={{ width: "100%", height: "100%", color: "var(--color-text)", animation: "spin-slow 60s linear infinite" }}
          >
            <defs>
              <path id="pack-ring" d="M100,100 m-88,0 a88,88 0 1,1 176,0 a88,88 0 1,1 -176,0" />
            </defs>
            <text fill="currentColor" style={{ fontFamily: "var(--font-mono)", fontSize: "6.4px", fontWeight: 700, letterSpacing: "2.6px" }}>
              <textPath href="#pack-ring">
                PULL THE FOIL ✦ RIP IT OPEN ✦ SOURCED IN ERBIL ✦ PRICED IN DINARS ✦ SEALED &amp; REAL ✦{" "}
              </textPath>
            </text>
          </svg>
        </div>

        <Sparkle top="20%" start="14%" size={14} color="var(--color-accent)" duration="2.4s" />
        <Sparkle top="14%" end="16%" size={9} color="var(--color-text)" delay="0.6s" duration="3s" />
        <Sparkle bottom="26%" end="11%" size={16} color="#d4a106" delay="1.1s" duration="2.7s" />
        <Sparkle bottom="20%" start="10%" size={10} color="var(--color-accent-secondary)" delay="0.3s" duration="3.2s" />

        <div
          ref={tiltRef}
          style={{ position: "absolute", inset: 0, transition: "transform .35s cubic-bezier(.2,.8,.2,1)", transformStyle: "preserve-3d" }}
        >
          <PackFloat product={left} side="start" open={open} delay="0.8s" duration="6s" />
          <PackFloat product={right} side="end" open={open} delay="0.3s" duration="5.4s" />

          <button
            type="button"
            onClick={rip}
            aria-label={t("ripPack")}
            style={{
              position: "absolute",
              left: "50%",
              top: "48%",
              width: "clamp(150px,17vw,240px)",
              transform: "translate(-50%,-50%)",
              zIndex: 3,
              cursor: phase === "idle" ? "pointer" : "default",
              background: "none",
              border: 0,
              padding: 0,
            }}
          >
            <div style={{ position: "relative", animation: centerAnimation }}>
              <div style={{ position: "relative", width: "100%", aspectRatio: "5/7" }}>
                <Image
                  src={center.image}
                  alt={center.name}
                  fill
                  sizes="(max-width: 768px) 40vw, 240px"
                  style={{ objectFit: "contain", filter: "drop-shadow(0 40px 36px var(--color-shadow))" }}
                  priority
                />
              </div>
              <span
                aria-hidden
                className="pack-holo"
                style={{
                  position: "absolute",
                  inset: "3% 7%",
                  borderRadius: 8,
                  animation: "holo-sweep 3.6s linear infinite",
                  pointerEvents: "none",
                }}
              />
            </div>
          </button>

          {open && (
            <>
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "48%",
                  width: 260,
                  height: 260,
                  borderRadius: "50%",
                  background: "#fff",
                  zIndex: 4,
                  animation: "flash-out 0.7s ease-out forwards",
                  pointerEvents: "none",
                }}
              />
              {burst.map((c, i) => (
                <div
                  key={c.key}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "48%",
                    width: "clamp(96px,9vw,138px)",
                    aspectRatio: "63/88",
                    transform: c.transform,
                    zIndex: c.z,
                    animation: `burst-in 0.8s ${i * 0.07}s cubic-bezier(.2,1.5,.4,1) both${c.hit ? ", pulled-glow 2s 0.9s ease-in-out infinite" : ""}`,
                    borderRadius: 12,
                    background: "var(--color-surface-2)",
                    padding: 5,
                    boxShadow: "0 20px 40px -12px var(--color-shadow)",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "100%",
                      borderRadius: 8,
                      overflow: "hidden",
                      background: franchiseColorVar(c.product.franchise),
                    }}
                  >
                    <Image src={c.product.image} alt="" fill sizes="140px" style={{ objectFit: "cover" }} />
                    <span aria-hidden className="pack-holo" style={{ position: "absolute", inset: 0, animation: "holo-sweep 2.6s linear infinite" }} />
                    <span
                      style={{
                        position: "absolute",
                        left: 6,
                        right: 6,
                        bottom: 6,
                        padding: "5px 6px",
                        borderRadius: 6,
                        background: "rgba(10,8,6,.82)",
                        color: "#fff",
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        textAlign: "center",
                      }}
                    >
                      {rarityT(c.rarity)}
                    </span>
                  </div>
                </div>
              ))}
              {pulled && (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: 22,
                    transform: "translateX(-50%)",
                    zIndex: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 16px 8px 8px",
                    borderRadius: 999,
                    background: "var(--color-text)",
                    color: "var(--color-bg)",
                    fontSize: 14,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    animation: "reveal-up 0.6s 0.6s cubic-bezier(.2,.8,.2,1) both",
                  }}
                >
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "var(--color-accent)",
                      color: "#fff",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {rarityT(pulled.rarity).toUpperCase()}
                  </span>
                  <span>{t("youPulled", { name: pulled.name })}</span>
                </div>
              )}
            </>
          )}
        </div>

        <div
          data-show={showInfo || undefined}
          style={{
            position: "absolute",
            insetInline: 0,
            bottom: 0,
            zIndex: 3,
            padding: "0.875rem",
            textAlign: "center",
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            background: "color-mix(in srgb, var(--color-bg) 90%, transparent)",
            borderTop: "var(--border-width) solid var(--color-border)",
          }}
        >
          {caption}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1.5">
        <span className="font-mono text-xs font-bold tracking-[0.14em] text-[var(--color-text-muted)]">
          {t("ripInstruction")}
        </span>
        <button
          type="button"
          onClick={open ? reseal : rip}
          className="flex h-[46px] cursor-pointer items-center gap-2.5 rounded-[var(--radius-full)] border-0 bg-[var(--color-text)] px-5 font-heading text-[15px] font-[var(--font-heading-weight)] text-[var(--color-bg)] transition-transform hover:-translate-y-0.5 hover:-rotate-1 active:scale-95"
        >
          <span className="h-2.5 w-2.5 rotate-45 bg-[var(--color-accent)]" />
          {open ? t("sealPack") : t("ripPack")}
        </button>
      </div>
    </div>
  );
}

function PackFloat({
  product,
  side,
  open,
  delay,
  duration,
}: {
  product: Product;
  side: "start" | "end";
  open: boolean;
  delay: string;
  duration: string;
}) {
  const dir = side === "start" ? -1 : 1;
  const restX = dir * 68;
  const openX = dir * 115;
  const restR = dir * (side === "start" ? -14 : 13);
  const openR = dir * 24;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "48%",
        width: "clamp(120px,14vw,190px)",
        transform: `translate(-50%,-50%) translateX(${open ? openX : restX}%) rotate(${open ? openR : restR}deg)`,
        opacity: open ? 0.35 : 1,
        transition: "transform .8s cubic-bezier(.2,.9,.2,1), opacity .6s",
        zIndex: 1,
      }}
    >
      <div className="pack-float" style={{ animation: `float ${duration} ${delay} ease-in-out infinite` }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "5/7" }}>
          <Image
            src={product.image}
            alt=""
            fill
            sizes="190px"
            style={{ objectFit: "contain", filter: "drop-shadow(0 30px 30px var(--color-shadow))" }}
          />
        </div>
      </div>
    </div>
  );
}

function Sparkle({
  top,
  bottom,
  start,
  end,
  size,
  color,
  delay = "0s",
  duration,
}: {
  top?: string;
  bottom?: string;
  start?: string;
  end?: string;
  size: number;
  color: string;
  delay?: string;
  duration: string;
}) {
  return (
    <span
      aria-hidden
      className="pack-twinkle"
      style={{
        position: "absolute",
        top,
        bottom,
        insetInlineStart: start,
        insetInlineEnd: end,
        width: size,
        height: size,
        background: color,
        animation: `twinkle ${duration} ${delay} infinite`,
      }}
    />
  );
}
