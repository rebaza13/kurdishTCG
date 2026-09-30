import {
  Bricolage_Grotesque,
  JetBrains_Mono,
  Noto_Kufi_Arabic,
  Noto_Sans_Arabic,
} from "next/font/google";

export const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Arabic-script pairing used for ar/ckb (Sorani Kurdish) — Bricolage
// Grotesque and JetBrains Mono above only cover Latin, so ar/ckb overrides
// --font-heading/--font-body to these in globals.css regardless of theme.
export const notoKufiArabic = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-kufi",
  display: "swap",
});

export const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-arabic",
  display: "swap",
});
