import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ar", "ckb"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeDirection: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
  ckb: "rtl",
};

export const localeLabel: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  ckb: "کوردی",
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});
