import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus, Store } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/market/listing-card";
import { getListings, LISTING_KINDS, type ListingKind } from "@/lib/market";
import { localizedAlternates } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

// Listings change whenever a seller publishes; never serve a stale grid.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "market" });
  return {
    title: t("kicker"),
    description: t("subtitle"),
    alternates: localizedAlternates(locale, "/market"),
  };
}

export default async function MarketPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { kind: kindParam } = await searchParams;
  const kind = LISTING_KINDS.includes(kindParam as ListingKind) ? (kindParam as ListingKind) : undefined;

  const [t, listings] = await Promise.all([getTranslations("market"), getListings({ kind })]);

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 py-10 md:px-10 md:py-14 flex flex-col gap-8">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-[62ch] flex-col gap-3">
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-accent)]">
            {t("kicker")}
          </span>
          <h1 className="text-4xl md:text-6xl">{t("title")}</h1>
          <p className="text-[var(--color-text-muted)]">{t("subtitle")}</p>
        </div>
        <Button asChild size="lg" className="self-start md:self-auto">
          <Link href="/sell/new">
            <Plus className="size-4" strokeWidth={2.6} />
            {t("sellCta")}
          </Link>
        </Button>
      </header>

      <nav className="kt-mk-tabs self-start" aria-label={t("kicker")}>
        <Link href="/market" aria-current={!kind ? "page" : undefined}>
          {t("all")}
        </Link>
        {LISTING_KINDS.map((k) => (
          <Link key={k} href={`/market?kind=${k}`} aria-current={kind === k ? "page" : undefined}>
            {t(`kindPlural.${k}`)}
          </Link>
        ))}
      </nav>

      {listings.length === 0 ? (
        <div className="kt-mk-panel flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-[var(--color-chip)]">
            <Store className="size-6 text-[var(--color-accent)]" />
          </span>
          <h2 className="text-xl">{t("empty")}</h2>
          <p className="max-w-[44ch] text-sm text-[var(--color-text-muted)]">{t("emptyBody")}</p>
          <Button asChild>
            <Link href="/sell/new">{t("sellCta")}</Link>
          </Button>
        </div>
      ) : (
        <div className="kt-lcard-grid">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
