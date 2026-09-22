"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import type { Product } from "@tcg/types";

export function ProductPurchase({ product }: { product: Product }) {
  const t = useTranslations("product");
  const [quantity, setQuantity] = useState(1);

  if (product.stock <= 0) {
    return <AddToCartButton product={product} size="lg" className="w-full justify-center" />;
  }

  return (
    <div className="flex items-stretch gap-3">
      <div className="flex items-center border-[length:var(--border-width)] border-[var(--color-border)] rounded-[var(--radius-sm)]">
        <button
          type="button"
          aria-label={t("quantity")}
          disabled={quantity <= 1}
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="grid size-11 place-items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="min-w-[2rem] text-center text-sm font-heading font-[var(--font-heading-weight)] [font-variant-numeric:tabular-nums]">
          {quantity}
        </span>
        <button
          type="button"
          aria-label={t("quantity")}
          disabled={quantity >= product.stock}
          onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
          className="grid size-11 place-items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      <AddToCartButton product={product} quantity={quantity} size="lg" className="flex-1 justify-center" />
    </div>
  );
}
