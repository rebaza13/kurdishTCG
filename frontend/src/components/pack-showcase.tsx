"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";

// Placeholder pack art for the hero — not tied to live inventory yet, hence
// hardcoded rather than pulled from getFeaturedProducts. Swap for real
// product photography (via /packs/) whenever it's shot.
const PACKS = [
  {
    src: "/packs/pokemon-30th-celebration.png",
    alt: "Pokémon 30th Celebration booster pack",
    side: "start" as const,
  },
  {
    src: "/packs/riftbound-vendetta.png",
    alt: "Riftbound: League of Legends Vendetta booster pack",
    side: "center" as const,
  },
  {
    src: "/packs/pokemon-perfect-order.png",
    alt: "Pokémon Mega Evolution Perfect Order booster pack",
    side: "end" as const,
  },
];

export function PackShowcase({ caption }: { caption: string }) {
  const groupRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number>(0);
  const [hovering, setHovering] = useState(false);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const group = groupRef.current;
    if (!group || e.pointerType === "touch") return;
    const rect = group.getBoundingClientRect();
    const px = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const py = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      group.style.setProperty("--rx", `${((0.5 - py) * 2 * 5).toFixed(2)}deg`);
      group.style.setProperty("--ry", `${((px - 0.5) * 2 * 8).toFixed(2)}deg`);
    });
  }, []);

  const onPointerLeave = useCallback(() => {
    const group = groupRef.current;
    cancelAnimationFrame(frame.current);
    setHovering(false);
    if (!group) return;
    group.style.setProperty("--rx", "0deg");
    group.style.setProperty("--ry", "0deg");
  }, []);

  return (
    <div
      className="pack-stage"
      data-hover={hovering ? "" : undefined}
      onPointerMove={onPointerMove}
      onPointerEnter={(e) => e.pointerType !== "touch" && setHovering(true)}
      onPointerLeave={onPointerLeave}
    >
      <div ref={groupRef} className="pack-stage__group">
        {PACKS.map((p) => (
          <div key={p.src} className="pack-stage__item" data-side={p.side}>
            <Image
              src={p.src}
              alt={p.alt}
              fill
              sizes="(max-width: 768px) 35vw, 190px"
              className="object-contain"
              priority={p.side === "center"}
            />
          </div>
        ))}
      </div>
      <span className="pack-stage__caption">{caption}</span>
    </div>
  );
}
