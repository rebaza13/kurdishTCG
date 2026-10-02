"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Catches anything that throws while rendering a page — most often a failed
 * Supabase read (network down, project paused). `retry` re-fetches and
 * re-renders the segment without a full page reload.
 */
export default function LocaleError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("states");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-[640px] flex-col px-4 py-16 md:py-24">
      <div className="kt-empty" role="alert">
        <span className="kt-empty__icon" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
        </span>
        <h1 className="kt-empty__title">{t("errorTitle")}</h1>
        <p className="kt-empty__body">{t("errorBody")}</p>
        <div className="kt-empty__actions">
          <button type="button" className="kt-btn-primary" onClick={() => retry()}>
            <span>{t("retry")}</span>
          </button>
          <Link href="/" className="kt-btn-outline">
            {t("goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
