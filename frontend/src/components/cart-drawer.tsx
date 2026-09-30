"use client";

import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { Check, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/price-tag";
import { cartSubtotal, useCartCount, useCartStore } from "@/lib/cart-store";

/** Desktop header trigger. The drawer itself is mounted once, in `Header`. */
export function CartButton() {
  const toggle = useCartStore((s) => s.toggle);
  const t = useTranslations("cart");
  const count = useCartCount();

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-11 cursor-pointer items-center gap-2.5 rounded-[var(--radius-full)] bg-[var(--color-text)] py-0 pe-2 ps-4.5 font-heading text-sm font-[var(--font-heading-weight)] text-[var(--color-bg)] transition-transform hover:-translate-y-0.5"
    >
      <span>{t("title")}</span>
      <span
        data-cart-target
        className="grid h-[30px] min-w-[30px] place-items-center rounded-[var(--radius-full)] bg-[var(--color-accent)] px-2 font-mono text-xs text-white [font-variant-numeric:tabular-nums]"
      >
        {count}
      </span>
    </button>
  );
}

/** Bottom-center pill toast for quick add-to-cart feedback — see cart-store's `showToast`. */
export function CartToast() {
  const toast = useCartStore((s) => s.toast);
  if (!toast) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-[max(1.75rem,calc(6.5rem+env(safe-area-inset-bottom)))] z-[80] mx-auto flex w-fit max-w-[calc(100vw-24px)] items-center gap-3 rounded-[var(--radius-full)] bg-[var(--color-text)] py-2.5 ps-2.5 pe-4.5 text-sm font-medium text-[var(--color-bg)] shadow-[var(--shadow-lg)] xl:bottom-7"
      style={{ animation: "toast-in .45s cubic-bezier(.2,1.2,.4,1) both" }}
    >
      <span className="grid size-7 flex-none place-items-center rounded-full bg-[var(--color-accent)] text-white">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
      <span className="truncate">{toast}</span>
    </div>
  );
}

/**
 * Mount exactly once: it is controlled by the cart store, and every trigger
 * (header button, mobile bottom nav, add-to-cart) just flips that state.
 * Two mounted copies would open two stacked dialogs at the same time.
 */
export function CartDrawer() {
  const { items, isOpen, close, setQuantity, removeItem } = useCartStore();
  const t = useTranslations("cart");

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => (open ? undefined : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          className="fixed inset-y-0 end-0 z-50 flex w-full max-w-[420px] flex-col bg-[var(--color-bg)] border-s-[length:var(--border-width)] border-[var(--color-border-strong)] shadow-[var(--shadow-lg)]"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between border-b-[length:var(--border-width)] border-[var(--color-border)] p-5">
            <Dialog.Title className="text-lg">{t("title")}</Dialog.Title>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Close">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <ShoppingBag className="size-8 text-[var(--color-text-muted)]" />
              <p className="font-heading font-[var(--font-heading-weight)]">{t("empty")}</p>
              <p className="text-sm text-[var(--color-text-muted)]">{t("emptyBody")}</p>
              <Dialog.Close asChild>
                <Button variant="secondary" size="sm">
                  {t("continueShopping")}
                </Button>
              </Dialog.Close>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto divide-y-[length:var(--border-width)] divide-[var(--color-border)]">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-3 p-5">
                    <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[var(--radius-xs)] bg-[var(--color-neutral-200)]">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Link
                        href={`/franchises/${item.franchise}/${item.slug}`}
                        className="font-heading font-[var(--font-heading-weight)] text-sm line-clamp-2 hover:text-[var(--color-accent)]"
                      >
                        {item.name}
                      </Link>
                      <PriceTag value={item.price} className="text-sm" />
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center border-[length:var(--border-width)] border-[var(--color-border)] rounded-[var(--radius-xs)]">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            className="p-1.5 cursor-pointer"
                            onClick={() => setQuantity(item.productId, item.quantity - 1)}
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="min-w-[1.5rem] text-center text-xs">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            className="p-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                            disabled={item.quantity >= item.stock}
                            onClick={() => setQuantity(item.productId, item.quantity + 1)}
                          >
                            <Plus className="size-3" />
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
                  </div>
                ))}
              </div>
              <div className="border-t-[length:var(--border-width)] border-[var(--color-border)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-[var(--font-heading-weight)]">
                    {t("subtotal")}
                  </span>
                  <PriceTag value={cartSubtotal(items)} className="text-lg" />
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">{t("shippingNote")}</p>
                <Dialog.Close asChild>
                  <Link href="/checkout" className="w-full">
                    <Button variant="primary" size="lg" className="w-full justify-center">
                      {t("checkout")}
                    </Button>
                  </Link>
                </Dialog.Close>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
