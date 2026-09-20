import {
  Archivo,
  Space_Grotesk,
  IBM_Plex_Sans,
  Noto_Kufi_Arabic,
  Noto_Sans_Arabic,
} from "next/font/google";

export const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-archivo",
  display: "swap",
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex",
  display: "swap",
});

// Arabic-script pairing used for ar/ckb (Sorani Kurdish) — Archivo, Space
// Grotesk and IBM Plex Sans above only cover Latin, so ar/ckb overrides
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
