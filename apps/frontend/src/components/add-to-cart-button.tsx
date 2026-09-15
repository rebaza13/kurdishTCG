"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShoppingBag, Check } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";
import type { Product } from "@tcg/types";

export function AddToCartButton({
  product,
  quantity = 1,
  size = "md",
  variant = "primary",
  className,
}: {
  product: Product;
  quantity?: number;
} & Pick<ButtonProps, "size" | "variant" | "className">) {
  const t = useTranslations("product");
  const addItem = useCartStore((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      disabled={product.stock <= 0}
      onClick={() => {
        addItem(product, quantity);
        setJustAdded(true);
        window.setTimeout(() => setJustAdded(false), 1600);
      }}
    >
      {justAdded ? <Check className="size-4" /> : <ShoppingBag className="size-4" />}
      {product.stock <= 0
        ? t("outOfStock")
        : justAdded
          ? t("addedToCart")
          : t("addToCart")}
    </Button>
  );
}
