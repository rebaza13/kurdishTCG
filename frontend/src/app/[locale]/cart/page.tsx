"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/price-tag";
import { cartSubtotal, useCartStore } from "@/lib/cart-store";

export default function CartPage() {
  const { items, setQuantity, removeItem } = useCartStore();
  const t = useTranslations("cart");

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <ShoppingBag className="size-10 text-[var(--color-text-muted)]" />
        <h1 className="text-2xl">{t("empty")}</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{t("emptyBody")}</p>
        <Link href="/franchises">
          <Button variant="primary">{t("continueShopping")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 md:px-10 grid lg:grid-cols-[1fr_360px] gap-10">
      <div>
        <h1 className="text-3xl mb-6">{t("title")}</h1>
        <div className="flex flex-col divide-y-[length:var(--border-width)] divide-[var(--color-border)] border-y-[length:var(--border-width)] border-[var(--color-border)]">
          {items.map((item) => (
            <div key={item.productId} className="flex gap-4 py-5">
              <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-[var(--radius-xs)] bg-[var(--color-neutral-200)]">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Link
                  href={`/franchises/${item.franchise}/${item.slug}`}
                  className="font-heading font-[var(--font-heading-weight)] hover:text-[var(--color-accent)]"
                >
                  {item.name}
                </Link>
                <PriceTag value={item.price} />
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center border-[length:var(--border-width)] border-[var(--color-border)] rounded-[var(--radius-xs)]">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      className="p-2 cursor-pointer"
                      onClick={() => setQuantity(item.productId, item.quantity - 1)}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="min-w-[2rem] text-center text-sm">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      className="p-2 cursor-pointer"
                      onClick={() => setQuantity(item.productId, item.quantity + 1)}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-[var(--color-text-muted)] underline-offset-2 hover:underline cursor-pointer"
                    onClick={() => removeItem(item.productId)}
                  >
                    {t("remove")}
                  </button>
                </div>
              </div>
              <PriceTag value={item.price * item.quantity} className="text-lg self-start" />
            </div>
          ))}
        </div>
      </div>

      <aside className="h-fit border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col gap-4 rounded-[var(--radius-lg)]">
        <div className="flex items-center justify-between">
          <span className="font-heading font-[var(--font-heading-weight)]">{t("subtotal")}</span>
          <PriceTag value={cartSubtotal(items)} className="text-xl" />
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">{t("shippingNote")}</p>
        <Link href="/checkout">
          <Button variant="primary" size="lg" className="w-full justify-center">
            {t("checkout")}
          </Button>
        </Link>
      </aside>
    </div>
  );
}
