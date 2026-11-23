"use client";

import Image from "next/image";
import { useState, type PointerEvent } from "react";
import { useTranslations } from "next-intl";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A card photo with an optional back. With a mouse, hovering turns it over
 * in 3D; on touch (and for keyboard users) the corner button flips it. When
 * `flipped` is passed the parent controls the side instead (detail gallery).
 * Cards without a back just tilt slightly under the pointer.
 */
export function FlipCard({
  front,
  back,
  alt,
  sizes = "(max-width: 640px) 46vw, 280px",
  priority = false,
  flipped,
  onFlippedChange,
  hoverFlip = true,
  tilt = false,
  className,
}: {
  front: string;
  back?: string | null;
  alt: string;
  sizes?: string;
  priority?: boolean;
  flipped?: boolean;
  onFlippedChange?: (flipped: boolean) => void;
  hoverFlip?: boolean;
  tilt?: boolean;
  className?: string;
}) {
  const t = useTranslations("market");
  const [ownFlipped, setOwnFlipped] = useState(false);
  const isFlipped = flipped ?? ownFlipped;
  const hasBack = Boolean(back);

  function toggle() {
    const next = !isFlipped;
    if (flipped === undefined) setOwnFlipped(next);
    onFlippedChange?.(next);
  }

  return (
    <div
      className={cn("kt-flip", className)}
      data-has-back={hasBack || undefined}
      data-flipped={isFlipped || undefined}
      data-hover-flip={(hasBack && hoverFlip) || undefined}
      data-tilt={tilt || undefined}
      onPointerMove={tilt ? trackTilt : undefined}
      onPointerLeave={tilt ? resetTilt : undefined}
    >
      <div className="kt-flip__inner">
        <div className="kt-flip__face kt-flip__face--front">
          <Image src={front} alt={alt} fill sizes={sizes} priority={priority} className="kt-flip__img" />
          <span className="kt-flip__shine" aria-hidden />
        </div>
        {hasBack && (
          <div className="kt-flip__face kt-flip__face--back" aria-hidden={!isFlipped}>
            <Image src={back!} alt={`${alt} — ${t("backSide")}`} fill sizes={sizes} className="kt-flip__img" />
            <span className="kt-flip__shine" aria-hidden />
          </div>
        )}
      </div>
      {hasBack && (
        <button
          type="button"
          className="kt-flip__btn"
          aria-label={isFlipped ? t("showFront") : t("showBack")}
          aria-pressed={isFlipped}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }}
        >
          <RotateCw className="size-3.5" strokeWidth={2.4} />
        </button>
      )}
    </div>
  );
}

function trackTilt(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  el.style.setProperty("--tx", `${((0.5 - y) * 10).toFixed(2)}deg`);
  el.style.setProperty("--ty", `${((x - 0.5) * 12).toFixed(2)}deg`);
  el.style.setProperty("--sx", `${(x * 100).toFixed(1)}%`);
  el.style.setProperty("--sy", `${(y * 100).toFixed(1)}%`);
}

function resetTilt(e: PointerEvent<HTMLElement>) {
  for (const p of ["--tx", "--ty", "--sx", "--sy"]) e.currentTarget.style.removeProperty(p);
}
