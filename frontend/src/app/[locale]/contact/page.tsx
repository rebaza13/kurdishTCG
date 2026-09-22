import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mail, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getSettings } from "@/lib/data";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contactPage" });
  return { title: t("title"), description: t("body") };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, settings] = await Promise.all([
    getTranslations("contactPage"),
    getSettings(),
  ]);

  const hasContact = settings.whatsappNumber || settings.contactEmail;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-10 md:py-14">
      <div className="flex flex-col gap-3 mb-8 max-w-[70ch]">
        <span className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)] font-heading font-[var(--font-heading-weight)]">
          {t("kicker")}
        </span>
        <h1 className="text-3xl md:text-5xl">{t("title")}</h1>
        <p className="text-sm md:text-base text-[var(--color-text-muted)] max-w-[60ch]">
          {t("body")}
        </p>
      </div>

      {hasContact ? (
        <div className="flex flex-col gap-3 max-w-[40ch]">
          {settings.whatsappNumber && (
            <a
              href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 border-[length:var(--border-width)] border-[var(--color-border)] rounded-[var(--radius-md)] hover:border-[var(--color-accent)] transition-colors"
            >
              <MessageCircle className="size-5 text-[var(--color-accent-tertiary)]" aria-hidden />
              <span className="flex flex-col">
                <span className="text-xs text-[var(--color-text-muted)]">{t("whatsappLabel")}</span>
                <span dir="ltr" className="font-heading font-[var(--font-heading-weight)]">
                  {settings.whatsappNumber}
                </span>
              </span>
            </a>
          )}
          {settings.contactEmail && (
            <a
              href={`mailto:${settings.contactEmail}`}
              className="flex items-center gap-3 px-4 py-3 border-[length:var(--border-width)] border-[var(--color-border)] rounded-[var(--radius-md)] hover:border-[var(--color-accent)] transition-colors"
            >
              <Mail className="size-5 text-[var(--color-accent-secondary)]" aria-hidden />
              <span className="flex flex-col">
                <span className="text-xs text-[var(--color-text-muted)]">{t("emailLabel")}</span>
                <span dir="ltr" className="font-heading font-[var(--font-heading-weight)]">
                  {settings.contactEmail}
                </span>
              </span>
            </a>
          )}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)] max-w-[50ch] border-[length:var(--border-width)] border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-4">
          {t("comingSoon")}
        </p>
      )}

      <div className="mt-10 pt-6 border-t-[length:var(--border-width)] border-[var(--color-border)] flex flex-wrap items-center gap-3">
        <span className="text-sm text-[var(--color-text-muted)]">{t("sellCta")}</span>
        <Link href="/sell">
          <Button size="sm" variant="secondary">
            {t("sellLink")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
