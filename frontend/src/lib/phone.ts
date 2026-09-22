/**
 * Iraqi mobile numbers only (07xx xxx xxxx, +964 7xx…, 00964 7xx…). Returns
 * the normalized local form `07xxxxxxxxx`, or null if it isn't one. Used on
 * both the checkout form (instant feedback) and the checkout route (the
 * browser's validation isn't trusted server-side).
 */
export function normalizeIraqiMobile(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  const match = /^(?:(?:\+|00)964|0)?(7\d{9})$/.exec(digits);
  return match ? `0${match[1]}` : null;
}
