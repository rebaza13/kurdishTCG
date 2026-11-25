import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SellerSpace } from "@/components/seller-space";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("sellToUs") };
}

export default async function SellPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sell");

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-8 px-4 py-12 md:px-10 md:py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl md:text-5xl">{t("title")}</h1>
        <p className="max-w-[60ch] text-sm text-[var(--color-text-muted)]">{t("body")}</p>
      </header>
      <SellerSpace />
    </div>
  );
}
