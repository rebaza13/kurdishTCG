import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("footer");
  const meta = useTranslations("meta");
  const nav = useTranslations("nav");

  return (
    <footer className="kt-footer">
      <div className="kt-footer__cols">
        <div className="kt-footer__brand">
          <span className="kt-logo" style={{ fontSize: 24 }}>
            {meta("siteName")
              .split(/(TCG)/i)
              .map((part, i) =>
                /^tcg$/i.test(part) ? (
                  <span key={i} className="kt-logo__accent">
                    {part}
                  </span>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
          </span>
          <span style={{ color: "var(--color-text-muted)", fontSize: 16, lineHeight: 1.5, maxWidth: "32ch" }}>
            {meta("tagline")}
          </span>
        </div>

        <div className="kt-footer__col">
          <span className="kt-footer__col-label">{t("shop")}</span>
          <Link href="/franchises">{nav("franchises")}</Link>
          <Link href="/franchises?sort=newest">{nav("newArrivals")}</Link>
          <Link href="/sell">{nav("sellToUs")}</Link>
          <Link href="/cart">{nav("cart")}</Link>
        </div>

        <div className="kt-footer__col">
          <span className="kt-footer__col-label">{t("company")}</span>
          <Link href="/about">{t("about")}</Link>
          <Link href="/contact">{t("contact")}</Link>
        </div>

        <div className="kt-footer__col">
          <span className="kt-footer__col-label">{t("support")}</span>
          <Link href="/shipping">{t("shippingInfo")}</Link>
          <Link href="/returns">{t("returns")}</Link>
          <Link href="/faq">{t("faq")}</Link>
        </div>
      </div>

      <div className="kt-footer__bottom">
        <span>
          © {new Date().getFullYear()} {meta("siteName")}
        </span>
        <span>ERBIL · KURDISTAN</span>
      </div>

      <div className="kt-footer__wordmark" aria-hidden>
        {meta("siteName")}
      </div>
    </footer>
  );
}
