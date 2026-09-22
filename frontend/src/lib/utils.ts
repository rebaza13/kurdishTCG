import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Main image first, then any distinct extras — dedupes so a gallery never repeats a shot. */
export function buildGalleryImages(main: string, extra: string[]): string[] {
  const seen = new Set<string>([main]);
  const rest = extra.filter((src) => {
    if (seen.has(src)) return false;
    seen.add(src);
    return true;
  });
  return [main, ...rest];
}

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

// The shop sells in Iraqi dinars only, in whole dinars (no decimals).
// Formatted by hand rather than Intl currency styles: Node and browsers
// disagree on `ckb` (Chrome falls back to English), which caused hydration
// mismatches in client-rendered prices.
export function formatPrice(value: number, locale: string): string {
  const base = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));

  if (locale === "ar" || locale === "ckb") {
    const digits = base
      .replace(/\d/g, (d) => ARABIC_INDIC_DIGITS[Number(d)])
      .replace(/,/g, "٬");
    return `${digits} د.ع`;
  }
  return `${base} IQD`;
}
