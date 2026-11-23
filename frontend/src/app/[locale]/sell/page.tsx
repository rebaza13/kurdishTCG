import { getTranslations, setRequestLocale } from "next-intl/server";
import { SellerHub, type HubTab } from "@/components/market/seller-hub";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seller" });
  return { title: t("kicker"), description: t("body") };
}

export default async function SellPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { tab } = await searchParams;
  const initialTab: HubTab = tab === "orders" || tab === "profile" ? tab : "listings";
  return <SellerHub initialTab={initialTab} />;
}
