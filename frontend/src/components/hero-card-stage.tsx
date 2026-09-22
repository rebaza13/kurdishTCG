"use client";

import Image from "next/image";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RarityBadge } from "@/components/rarity-badge";
import { PriceTag } from "@/components/price-tag";
import type { Product } from "@tcg/types";

const MAX_TILT_X = 14;
const MAX_TILT_Y = 18;
const COARSE_QUERY = "(hover: none)";

function subscribeCoarse(onChange: () => void) {
  const mq = window.matchMedia(COARSE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function HeroCardStage({ cards, caption }: { cards: Product[]; caption: string }) {
  const t = useTranslations("home");
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const frame = useRef<number>(0);
  const [hovering, setHovering] = useState(false);
  const coarse = useSyncExternalStore(
    subscribeCoarse,
    () => window.matchMedia(COARSE_QUERY).matches,
    () => false
  );

  const [main, ...rest] = cards;

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card || e.pointerType === "touch") return;
    const rect = card.getBoundingClientRect();
    const px = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const py = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      card.style.setProperty("--rx", `${((0.5 - py) * 2 * MAX_TILT_X).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${((px - 0.5) * 2 * MAX_TILT_Y).toFixed(2)}deg`);
      card.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
      card.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    });
  }, []);

  const onPointerLeave = useCallback(() => {
    const card = cardRef.current;
    cancelAnimationFrame(frame.current);
    setHovering(false);
    if (!card) return;
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--mx", "50%");
    card.style.setProperty("--my", "50%");
  }, []);

  if (!main) return null;

  const href = `/franchises/${main.franchise}/${main.slug}`;
  const showInfo = hovering || coarse;

  return (
    <div
      ref={stageRef}
      className="hero-stage"
      data-hover={hovering ? "" : undefined}
      onPointerMove={onPointerMove}
      onPointerEnter={(e) => e.pointerType !== "touch" && setHovering(true)}
      onPointerLeave={onPointerLeave}
    >
      <div className="hero-stage__fan" aria-hidden>
        {rest.slice(0, 2).map((p, i) => (
          <div key={p.id} className="hero-fan-card" data-side={i === 0 ? "start" : "end"}>
            <Image src={p.image} alt="" fill sizes="240px" className="object-cover" />
          </div>
        ))}
      </div>

      <Link href={href} className="hero-card" ref={cardRef} aria-label={main.name}>
        <div className="hero-card__tilt">
          <div className="hero-card__face">
            <Image
              src={main.image}
              alt={main.name}
              fill
              sizes="(max-width: 768px) 70vw, 340px"
              className="object-cover"
              priority
            />
            <div className="hero-card__holo" aria-hidden />
            <div className="hero-card__glare" aria-hidden />
          </div>
        </div>
      </Link>

      <div className="hero-stage__info" data-show={showInfo ? "" : undefined}>
        <RarityBadge rarity={main.rarity} />
        <span className="hero-stage__name">{main.name}</span>
        <span className="hero-stage__set">{main.set}</span>
        <div className="hero-stage__row">
          <PriceTag value={main.price} className="text-xl" />
          <Link href={href} className="hero-stage__cta">
            {t("heroViewCard")}
          </Link>
        </div>
      </div>

      <span className="hero-stage__caption">
        {showInfo ? caption : t(coarse ? "heroTapHint" : "heroHoverHint")}
      </span>
    </div>
  );
}
