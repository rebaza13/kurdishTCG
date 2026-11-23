import type { Locale } from "@/i18n/routing";

/**
 * Iraq's governorates as delivery/ships-from cities. Codes match the map
 * geometry ids (components/map/geo-data.ts) and the `is_iraq_city()` check
 * in supabase/migrations/0008_marketplace.sql — keep all three in sync.
 */
export const IRAQ_CITIES = {
  erbil: { en: "Erbil", ar: "أربيل", ckb: "هەولێر" },
  sulaymaniyah: { en: "Sulaymaniyah", ar: "السليمانية", ckb: "سلێمانی" },
  duhok: { en: "Duhok", ar: "دهوك", ckb: "دهۆک" },
  kirkuk: { en: "Kirkuk", ar: "كركوك", ckb: "کەرکووک" },
  ninawa: { en: "Nineveh", ar: "نينوى", ckb: "نەینەوا" },
  salahaddin: { en: "Saladin", ar: "صلاح الدين", ckb: "سەڵاحەدین" },
  diyala: { en: "Diyala", ar: "ديالى", ckb: "دیالە" },
  baghdad: { en: "Baghdad", ar: "بغداد", ckb: "بەغدا" },
  anbar: { en: "Anbar", ar: "الأنبار", ckb: "ئەنبار" },
  babil: { en: "Babil", ar: "بابل", ckb: "بابل" },
  karbala: { en: "Karbala", ar: "كربلاء", ckb: "کەربەلا" },
  najaf: { en: "Najaf", ar: "النجف", ckb: "نەجەف" },
  wasit: { en: "Wasit", ar: "واسط", ckb: "واست" },
  qadisiyah: { en: "Qadisiyah", ar: "القادسية", ckb: "قادسیە" },
  maysan: { en: "Maysan", ar: "ميسان", ckb: "مەیسان" },
  dhiqar: { en: "Dhi Qar", ar: "ذي قار", ckb: "زیقار" },
  muthanna: { en: "Muthanna", ar: "المثنى", ckb: "موسەننا" },
  basra: { en: "Basra", ar: "البصرة", ckb: "بەسرە" },
} as const satisfies Record<string, Record<Locale, string>>;

export type CityCode = keyof typeof IRAQ_CITIES;

/** Regions drawn on the Kurdistan map (the Sorani storefront's default). */
export const KURDISTAN_CITIES: readonly CityCode[] = [
  "duhok",
  "erbil",
  "sulaymaniyah",
  "kirkuk",
  "ninawa",
  "salahaddin",
  "diyala",
];

export function isCityCode(value: unknown): value is CityCode {
  return typeof value === "string" && Object.hasOwn(IRAQ_CITIES, value);
}

export function cityName(code: string | null | undefined, locale: string): string {
  if (!isCityCode(code)) return code ?? "";
  const names: Record<Locale, string> = IRAQ_CITIES[code];
  return names[locale as Locale] ?? names.en;
}
