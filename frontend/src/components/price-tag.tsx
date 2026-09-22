import { formatPrice } from "@/lib/utils";
import { useLocale } from "next-intl";

export function PriceTag({ value, className }: { value: number; className?: string }) {
  const locale = useLocale();
  return (
    <span className={`font-heading font-[var(--font-heading-weight)] [font-variant-numeric:tabular-nums] ${className ?? ""}`}>
      {formatPrice(value, locale)}
    </span>
  );
}
