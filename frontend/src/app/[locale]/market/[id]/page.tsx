import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ListingDetail } from "@/components/market/listing-detail";
import { getListing } from "@/lib/market";
import { getFranchises } from "@/lib/data";
import { localizedAlternates } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const [listing, t] = await Promise.all([getListing(id), getTranslations({ locale, namespace: "market" })]);
  if (!listing) return { title: t("kicker") };
  return {
    title: listing.title,
    description: listing.description || t("subtitle"),
    alternates: localizedAlternates(locale, `/market/${id}`),
    openGraph: { title: listing.title, images: [{ url: listing.cover }] },
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const listing = await getListing(id);
  if (!listing) notFound();

  const franchises = listing.franchise ? await getFranchises(locale) : [];
  const franchiseName = franchises.find((f) => f.slug === listing.franchise)?.name ?? null;

  return <ListingDetail listing={listing} franchiseName={franchiseName} />;
}
