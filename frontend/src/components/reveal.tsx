"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll-triggered entrance, ported from the mockup's `setupReveal()`:
 * elements starting below the fold sit at opacity 0 until they cross the
 * viewport, then animate in once via the Web Animations API. Elements
 * already on screen at mount (nothing to reveal) render as-is.
 */
export function Reveal({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top <= window.innerHeight) return;

    el.style.opacity = "0";
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.animate(
            [
              { opacity: 0, transform: "translateY(40px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 800, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
          );
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
