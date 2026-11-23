import { getTranslations, setRequestLocale } from "next-intl/server";
import { getFranchises } from "@/lib/data";
import { NewListingFlow } from "@/components/market/new-listing-flow";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seller" });
  return { title: t("newListing"), robots: { index: false } };
}

export default async function NewListingPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const franchises = await getFranchises(locale);
  return <NewListingFlow franchises={franchises.map((f) => ({ slug: f.slug, name: f.name }))} />;
}
