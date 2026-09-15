import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";

export default async function SellPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sell");

  return (
    <div className="px-4 py-24 md:px-10 flex flex-col items-center text-center gap-4 max-w-[60ch] mx-auto">
      <h1 className="text-3xl md:text-5xl">{t("title")}</h1>
      <p className="text-sm text-[var(--color-text-muted)]">{t("body")}</p>
      <Button size="lg" disabled>
        {t("comingSoon")}
      </Button>
    </div>
  );
}
