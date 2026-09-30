"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Attach to a section wrapper to fade + rise it in once it's ~12% into the
 * viewport, instead of on mount. Returns a ref and a `data-reveal` value —
 * pairs with the `[data-reveal="pending"|"shown"]` rules in globals.css.
 * Starts `undefined` (renders normally) until JS confirms IntersectionObserver
 * is available, so content never gets stuck invisible without it.
 */
export function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [state, setState] = useState<"pending" | "shown" | undefined>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top > window.innerHeight) {
      setState("pending");
    } else {
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setState("shown");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, "data-reveal": state } as const;
}
