"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";

/**
 * Framed product image, plus a thumbnail strip when the product has more
 * than one shot. The thumbnail strip sits inside the same card and rides up
 * over the image's bottom edge via `--image-overlap` / `--image-fade` — a
 * no-op in the flat Storefront (light) theme, and the "dissolve into the
 * panel" treatment in Neon Vault (dark). Single-image products (the common
 * case today) render exactly like a plain framed image.
 *
 * `fit="contain"` is for sealed product photographed on white: the shot is
 * contained (never cropped) on a lit plate tinted with `accent`, the same
 * treatment the product cards use.
 */
export function ProductGallery({
  images,
  alt,
  fit = "cover",
  accent,
}: {
  images: string[];
  alt: string;
  fit?: "cover" | "contain";
  accent?: string;
}) {
  const [active, setActive] = useState(0);
  const shown = images[Math.min(active, images.length - 1)] ?? images[0];

  return (
    <div
      className="product-gallery"
      style={accent ? ({ "--card-accent": accent } as CSSProperties) : undefined}
    >
      <div className="product-media" data-fit={fit}>
        <Image
          key={shown}
          src={shown}
          alt={alt}
          fill
          sizes="(max-width: 768px) 340px, 400px"
          className={fit === "contain" ? undefined : "object-cover"}
          priority
        />
        <div className="product-media__fade" aria-hidden />
      </div>

      {images.length > 1 && (
        <div className="product-thumbs" role="tablist" aria-label={alt}>
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`${alt} ${i + 1}`}
              data-active={i === active ? "" : undefined}
              className="product-thumb"
              onClick={() => setActive(i)}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="52px"
                className={fit === "contain" ? "object-contain bg-white" : "object-cover"}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
