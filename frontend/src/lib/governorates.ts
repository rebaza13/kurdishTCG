/**
 * Iraq's governorates. The English name is what's stored on the order
 * (`orders.city`) so the dashboard and Telegram alerts read the same in every
 * language; the shopper sees the label in their own locale.
 */
export const GOVERNORATES = [
  { en: "Baghdad", ar: "بغداد", ckb: "بەغدا" },
  { en: "Basra", ar: "البصرة", ckb: "بەسرە" },
  { en: "Nineveh", ar: "نينوى", ckb: "نەینەوا" },
  { en: "Erbil", ar: "أربيل", ckb: "هەولێر" },
  { en: "Sulaymaniyah", ar: "السليمانية", ckb: "سلێمانی" },
  { en: "Duhok", ar: "دهوك", ckb: "دهۆک" },
  { en: "Halabja", ar: "حلبجة", ckb: "هەڵەبجە" },
  { en: "Kirkuk", ar: "كركوك", ckb: "کەرکووک" },
  { en: "Anbar", ar: "الأنبار", ckb: "ئەنبار" },
  { en: "Babylon", ar: "بابل", ckb: "بابل" },
  { en: "Karbala", ar: "كربلاء", ckb: "کەربەلا" },
  { en: "Najaf", ar: "النجف", ckb: "نەجەف" },
  { en: "Diyala", ar: "ديالى", ckb: "دیالە" },
  { en: "Wasit", ar: "واسط", ckb: "واست" },
  { en: "Maysan", ar: "ميسان", ckb: "میسان" },
  { en: "Dhi Qar", ar: "ذي قار", ckb: "زیقار" },
  { en: "Muthanna", ar: "المثنى", ckb: "موسەننا" },
  { en: "Al-Qadisiyyah", ar: "القادسية", ckb: "قادسیە" },
  { en: "Saladin", ar: "صلاح الدين", ckb: "سەلاحەدین" },
] as const;

const NAMES = new Set<string>(GOVERNORATES.map((g) => g.en));

export function isGovernorate(value: string): boolean {
  return NAMES.has(value);
}
