"use client";

import type { ReactNode } from "react";
import { useScrollReveal } from "@/lib/use-scroll-reveal";

/**
 * Fades + rises its children in once scrolled ~12% into view. A thin client
 * wrapper so server-rendered section content (headers, grids) can still opt
 * into the scroll-reveal motion without the whole page becoming a client
 * component — see lib/use-scroll-reveal.ts.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const reveal = useScrollReveal<HTMLDivElement>();
  return (
    <div ref={reveal.ref} data-reveal={reveal["data-reveal"]} className={className}>
      {children}
    </div>
  );
}
