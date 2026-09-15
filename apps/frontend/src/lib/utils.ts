import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

// Formatted by hand rather than Intl currency styles: Node and browsers
// disagree on `ckb` (Chrome falls back to English), which caused hydration
// mismatches in client-rendered prices.
export function formatPrice(value: number, locale: string): string {
  const base = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  if (locale === "ar" || locale === "ckb") {
    const digits = base
      .replace(/\d/g, (d) => ARABIC_INDIC_DIGITS[Number(d)])
      .replace(/,/g, "٬")
      .replace(".", "٫");
    return `US$ ${digits}`;
  }
  return `$${base}`;
}
