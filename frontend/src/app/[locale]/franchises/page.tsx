import { getTranslations, setRequestLocale } from "next-intl/server";
import { FranchiseTile } from "@/components/franchise-tile";
import { getFranchises } from "@/lib/data";
import type { Locale } from "@/i18n/routing";

export default async function FranchisesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, franchises] = await Promise.all([
    getTranslations("franchises"),
    getFranchises(locale),
  ]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-10 md:py-14">
      <div className="flex flex-col gap-3 mb-6 md:mb-10 max-w-[70ch]">
        <span className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-heading font-[var(--font-heading-weight)]">
          {t("kicker")}
        </span>
        <h1 className="text-3xl md:text-5xl">{t("title")}</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{t("subtitle")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
        {franchises.map((f) => (
          <FranchiseTile key={f.slug} franchise={f} />
        ))}
        <div className="col-span-2 flex flex-col justify-center gap-2 p-5 border-[length:var(--border-width)] border-[var(--color-border)] rounded-[var(--radius-lg)] md:col-span-1" style={{ background: "var(--gradient-primary)" }}>
          <h3 className="text-2xl text-[var(--color-accent-ink)]">{t("comingSoonTitle")}</h3>
          <p className="text-sm text-[var(--color-accent-ink)] opacity-90">
            {t("comingSoonBody")}
          </p>
        </div>
      </div>
    </div>
  );
}
