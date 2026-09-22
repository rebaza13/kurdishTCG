import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faqPage" });
  return { title: t("title") };
}

const QUESTION_KEYS = [1, 2, 3, 4, 5, 6] as const;

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("faqPage");

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-10 md:py-14">
      <div className="flex flex-col gap-3 mb-8 max-w-[70ch]">
        <span className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-heading font-[var(--font-heading-weight)]">
          {t("kicker")}
        </span>
        <h1 className="text-3xl md:text-5xl">{t("title")}</h1>
      </div>
      <div className="flex flex-col max-w-[70ch] border-t-[length:var(--border-width)] border-[var(--color-border)]">
        {QUESTION_KEYS.map((n) => (
          <details
            key={n}
            className="group border-b-[length:var(--border-width)] border-[var(--color-border)] py-4"
          >
            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-heading font-[var(--font-heading-weight)] text-base md:text-lg">
              {t(`q${n}`)}
              <span className="shrink-0 text-[var(--color-text-muted)] transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm md:text-base text-[var(--color-text-muted)] max-w-[60ch]">
              {t(`a${n}`)}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
