/**
 * Arabic phone keyboards (and Sorani ones) type Arabic-Indic digits
 * (٠١٢…٩, U+0660–0669) or Extended/Persian ones (۰۱۲…۹, U+06F0–06F9).
 * Map both to ASCII before validating, otherwise a perfectly valid
 * `٠٧٥٠١٢٣٤٥٦٧` is rejected for ar/ckb shoppers.
 */
function toAsciiDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (ch) => {
    const code = ch.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

/**
 * Iraqi mobile numbers only (07xx xxx xxxx, +964 7xx…, 00964 7xx…). Returns
 * the normalized local form `07xxxxxxxxx`, or null if it isn't one. Used on
 * both the checkout form (instant feedback) and the checkout route (the
 * browser's validation isn't trusted server-side).
 */
export function normalizeIraqiMobile(input: string): string | null {
  const digits = toAsciiDigits(input).replace(/[\s\-().‎‏]/g, "");
  const match = /^(?:(?:\+|00)964|0)?(7\d{9})$/.exec(digits);
  return match ? `0${match[1]}` : null;
}
