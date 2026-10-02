import {
  Bricolage_Grotesque,
  JetBrains_Mono,
  Noto_Kufi_Arabic,
  Noto_Sans_Arabic,
} from "next/font/google";

// The whole site — headings and body alike — runs on one display face, per
// the KurdishTCG design (see the "Bundled Page" mockup this was extracted
// from). Variable font: no discrete `weight` list, so 400–800 all resolve
// from the one file.
export const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

// Mono accents only: kickers, prices, chips, the spinning ring label.
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

// Arabic-script pairing used for ar/ckb (Sorani Kurdish) — Archivo, Space
// Grotesk and IBM Plex Sans above only cover Latin, so ar/ckb overrides
// --font-heading/--font-body to these in globals.css regardless of theme.
export const notoKufiArabic = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-kufi",
  display: "swap",
  preload: false,
});

export const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-sans-arabic",
  display: "swap",
  preload: false,
});
