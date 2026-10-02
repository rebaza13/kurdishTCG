import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

type Action = { href: string; label: string };

/**
 * Shown wherever a list can legitimately be empty (no franchises yet, no
 * products yet, a search with no hits) so the page never renders as blank
 * space. Server-safe — takes already-translated strings.
 */
export function EmptyState({
  title,
  body,
  action,
  secondary,
  icon,
  compact,
}: {
  title: string;
  body?: string;
  action?: Action;
  secondary?: Action;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="kt-empty" data-compact={compact || undefined} role="status">
      <span className="kt-empty__icon" aria-hidden>
        {icon ?? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8 12 3 3 8m18 0-9 5m9-5v8l-9 5m0-8L3 8m9 5v8M3 8v8l9 5" />
          </svg>
        )}
      </span>
      <h3 className="kt-empty__title">{title}</h3>
      {body && <p className="kt-empty__body">{body}</p>}
      {(action || secondary) && (
        <div className="kt-empty__actions">
          {action && (
            <Link href={action.href} className="kt-btn-primary">
              <span>{action.label}</span>
            </Link>
          )}
          {secondary && (
            <Link href={secondary.href} className="kt-btn-outline">
              {secondary.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
