"use client";

import Image from "next/image";

/**
 * Admin-side mirror of the storefront's ProductCard (frontend/src/components/
 * product-card.tsx + `.kt-card` in its globals.css), so the main image can be
 * checked exactly as shoppers will see it:
 * - Sealed: white plate, image `contain`ed, solid dark info panel below.
 * - Single card: image fills the card (`cover`) under a dark bottom scrim.
 */
export function ProductCardPreview({
  image,
  name,
  set,
  meta,
  price,
  franchise,
  accent,
  single,
}: {
  image: string;
  name: string;
  set: string;
  meta: string;
  price: string;
  franchise?: string;
  accent?: string;
  single: boolean;
}) {
  const color = accent && /^(#|rgb|hsl|oklch)/i.test(accent) ? accent : "#e8463a";
  const canRender = (() => {
    if (!image) return false;
    if (image.startsWith("/")) return true;
    try {
      new URL(image);
      return true;
    } catch {
      return false;
    }
  })();

  const body = (
    <div className="flex min-w-0 flex-col gap-1 p-3" style={{ background: single ? undefined : "#0b0a09" }}>
      <span className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-white/80">
        <span className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
        <span className="truncate">{meta}</span>
      </span>
      <h3 className="line-clamp-2 text-[15px] font-bold leading-tight text-white">
        {name || "Product name"}
      </h3>
      <span className="truncate text-xs text-white/60">{set || "Set"}</span>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-sm font-bold text-white">{price}</span>
        <span
          className="flex size-9 items-center justify-center rounded-full text-white"
          style={{ background: color }}
          aria-hidden
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </div>
    </div>
  );

  const chip = franchise && (
    <span className="absolute left-2.5 top-2.5 z-10 flex max-w-[80%] items-center gap-1.5 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
      <span className="size-2 shrink-0 rounded-sm" style={{ background: color }} />
      <span className="truncate">{franchise}</span>
    </span>
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted">Storefront preview</span>
      <article
        className="relative isolate flex w-56 flex-col justify-end overflow-hidden rounded-xl bg-[#0b0a09] shadow-md"
        style={{ aspectRatio: single ? "63 / 88" : "63 / 100" }}
      >
        {chip}
        {single ? (
          <>
            <div className="absolute inset-0 -z-10">
              {canRender && <Image src={image} alt="" fill unoptimized sizes="224px" className="object-cover" />}
            </div>
            <span
              className="absolute inset-0 -z-[5]"
              style={{
                background:
                  "linear-gradient(to top, rgb(11 10 9 / .97) 0%, rgb(11 10 9 / .9) 30%, rgb(11 10 9 / .5) 50%, transparent 72%)",
              }}
            />
            {body}
          </>
        ) : (
          <>
            <div className="relative min-h-0 flex-1 bg-white">
              {canRender && (
                <Image
                  src={image}
                  alt=""
                  fill
                  unoptimized
                  sizes="224px"
                  className="object-contain"
                  style={{ padding: "10% 6% 4%" }}
                />
              )}
              {!canRender && (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-neutral-400">
                  No image yet
                </span>
              )}
            </div>
            {body}
          </>
        )}
      </article>
    </div>
  );
}
