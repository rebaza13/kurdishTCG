/** Pill colours for an order's fulfillment status (account list + detail). */
export const statusPillClass: Record<string, string> = {
  requested: "border-[var(--color-border-strong)] text-[var(--color-text)]",
  confirmed: "border-[var(--color-accent-secondary)] text-[var(--color-accent-secondary)]",
  shipped: "border-[var(--color-accent-secondary)] text-[var(--color-accent-secondary)]",
  delivered: "border-[var(--color-accent-secondary)] text-[var(--color-accent-secondary)]",
  cancelled: "border-[var(--color-border)] text-[var(--color-text-muted)]",
};
