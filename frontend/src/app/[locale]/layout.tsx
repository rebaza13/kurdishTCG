import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  archivo,
  ibmPlexSans,
  notoKufiArabic,
  notoSansArabic,
  spaceGrotesk,
} from "@/app/fonts";
import { ThemeProvider } from "@/components/theme-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { locales, localeDirection, type Locale } from "@/i18n/routing";
import "@/app/globals.css";

// `cover` lets the bottom nav read env(safe-area-inset-bottom) on notched iPhones/iPads.
export const viewport: Viewport = { viewportFit: "cover" };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { default: t("siteName"), template: `%s · ${t("siteName")}` },
    description: t("tagline"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);

  const dir = localeDirection[locale as Locale];

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${archivo.variable} ${spaceGrotesk.variable} ${ibmPlexSans.variable} ${notoKufiArabic.variable} ${notoSansArabic.variable}`}
    >
      <body className="font-body antialiased">
        <ThemeProvider>
          <NextIntlClientProvider>
            {/* pb clears the floating <BottomNav /> (phone + tablet only) */}
            <div className="flex min-h-screen flex-col pb-[calc(6rem+env(safe-area-inset-bottom))] xl:pb-0">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <BottomNav />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
