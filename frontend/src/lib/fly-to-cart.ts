"use client";

/**
 * A small dot flies from the clicked add-to-cart button to whichever cart
 * bubble is currently visible (header on desktop, bottom nav FAB on
 * phone/tablet — both are marked `data-cart-target`), then bumps it. Purely
 * decorative: failures (no visible target, reduced motion) are silent no-ops.
 */
export function flyToCart(origin: HTMLElement) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const target = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-target]")).find(
    (el) => el.offsetParent !== null
  );
  if (!target) return;

  const a = origin.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const dot = document.createElement("div");
  dot.style.cssText = [
    "position:fixed",
    `left:${a.left + a.width / 2 - 7}px`,
    `top:${a.top + a.height / 2 - 7}px`,
    "width:14px",
    "height:14px",
    "border-radius:5px",
    "background:var(--color-accent)",
    "z-index:999",
    "pointer-events:none",
  ].join(";");
  document.body.appendChild(dot);

  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);

  const flight = dot.animate(
    [
      { transform: "translate(0,0) rotate(0) scale(1)", offset: 0 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 110}px) rotate(200deg) scale(1.3)`, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) rotate(405deg) scale(.4)`, offset: 1 },
    ],
    { duration: 650, easing: "cubic-bezier(.5,0,.5,1)" }
  );
  flight.onfinish = () => {
    dot.remove();
    target.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.45)" }, { transform: "scale(1)" }],
      { duration: 420, easing: "cubic-bezier(.3,1.6,.5,1)" }
    );
  };
}
