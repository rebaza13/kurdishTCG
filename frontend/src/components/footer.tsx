import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("footer");
  const meta = useTranslations("meta");
  const nav = useTranslations("nav");

  return (
    <footer className="overflow-hidden border-t-[length:var(--border-width)] border-[var(--color-border)]">
      <div className="mx-auto max-w-[1440px] px-4 py-14 md:px-10 grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <span className="text-2xl font-heading font-[var(--font-heading-weight)] tracking-tight">
            {meta("siteName").split(/(TCG)/i).map((part, i) =>
              /^tcg$/i.test(part) ? (
                <span key={i} className="text-[var(--color-accent)]">
                  {part}
                </span>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </span>
          <p className="text-sm text-[var(--color-text-muted)] max-w-[32ch]">
            {meta("tagline")}
          </p>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <span className="font-heading font-[var(--font-heading-weight)] text-xs uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
            {t("shop")}
          </span>
          <Link href="/franchises" className="hover:text-[var(--color-accent)]">
            {nav("franchises")}
          </Link>
          <Link href="/franchises?sort=newest" className="hover:text-[var(--color-accent)]">
            {nav("newArrivals")}
          </Link>
          <Link href="/franchises?graded=1" className="hover:text-[var(--color-accent)]">
            {nav("graded")}
          </Link>
          <Link href="/sell" className="hover:text-[var(--color-accent)]">
            {nav("sellToUs")}
          </Link>
          <Link href="/cart" className="hover:text-[var(--color-accent)]">
            {nav("cart")}
          </Link>
          <Link href="/account" className="hover:text-[var(--color-accent)]">
            {nav("account")}
          </Link>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <span className="font-heading font-[var(--font-heading-weight)] text-xs uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
            {t("company")}
          </span>
          <Link href="/" className="hover:text-[var(--color-accent)]">
            {t("about")}
          </Link>
          <Link href="/" className="hover:text-[var(--color-accent)]">
            {t("contact")}
          </Link>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <span className="font-heading font-[var(--font-heading-weight)] text-xs uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
            {t("support")}
          </span>
          <Link href="/" className="hover:text-[var(--color-accent)]">
            {t("shippingInfo")}
          </Link>
          <Link href="/" className="hover:text-[var(--color-accent)]">
            {t("returns")}
          </Link>
          <Link href="/" className="hover:text-[var(--color-accent)]">
            {t("faq")}
          </Link>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-3 px-4 pt-8 md:px-10 font-mono text-xs text-[var(--color-text-muted)]">
        <span>© {new Date().getFullYear()} {meta("siteName")}. {t("rights")}</span>
        <span>ERBIL · KURDISTAN</span>
      </div>
      <div
        aria-hidden
        className="mt-5 select-none whitespace-nowrap text-center font-heading font-[var(--font-heading-weight)] leading-[0.78] tracking-[-0.06em] text-[var(--color-surface)]"
        style={{ fontSize: "clamp(72px,17vw,260px)" }}
      >
        {meta("siteName")}
      </div>
    </footer>
  );
}
