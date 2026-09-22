import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "returnsPage" });
  return { title: t("title"), description: t("p1") };
}

export default async function ReturnsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("returnsPage");

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-10 md:py-14">
      <div className="flex flex-col gap-3 mb-8 max-w-[70ch]">
        <span className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-heading font-[var(--font-heading-weight)]">
          {t("kicker")}
        </span>
        <h1 className="text-3xl md:text-5xl">{t("title")}</h1>
      </div>
      <div className="flex flex-col gap-4 max-w-[60ch] text-sm md:text-base text-[var(--color-text-muted)]">
        <p>{t("p1")}</p>
        <p>{t("p2")}</p>
        <p>{t("p3")}</p>
        <p className="text-xs pt-2 border-t-[length:var(--border-width)] border-[var(--color-border)]">
          {t("note")}
        </p>
      </div>
    </div>
  );
}
