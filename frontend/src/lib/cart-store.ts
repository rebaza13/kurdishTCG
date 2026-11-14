"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@tcg/types";
import { getSupabaseClient } from "@/lib/supabase/client";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  /** Apply a server-reported stock level: clamps the line, drops it at 0. */
  syncStock: (productId: string, stock: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (product, quantity = 1) => {
        if (product.stock <= 0 || quantity <= 0) return;
        const items = get().items;
        const existing = items.find((i) => i.productId === product.id);
        if (existing) {
          set({
            items: items.map((i) =>
              i.productId === product.id
                ? { ...i, stock: product.stock, quantity: Math.min(i.quantity + quantity, product.stock) }
                : i
            ),
            isOpen: true,
          });
        } else {
          set({
            items: [
              ...items,
              {
                productId: product.id,
                slug: product.slug,
                franchise: product.franchise,
                name: product.name,
                price: product.price,
                image: product.image,
                stock: product.stock,
                quantity: Math.min(quantity, product.stock),
              },
            ],
            isOpen: true,
          });
        }
      },
      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),
      setQuantity: (productId, quantity) =>
        set({
          items:
            quantity <= 0
              ? get().items.filter((i) => i.productId !== productId)
              : get().items.map((i) =>
                  i.productId === productId
                    ? { ...i, quantity: Number.isFinite(i.stock) ? Math.min(quantity, i.stock) : i.quantity }
                    : i
                ),
        }),
      syncStock: (productId, stock) =>
        set({
          items:
            stock <= 0
              ? get().items.filter((i) => i.productId !== productId)
              : get().items.map((i) =>
                  i.productId === productId
                    ? { ...i, stock, quantity: Math.min(i.quantity, stock) }
                    : i
                ),
        }),
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set({ isOpen: !get().isOpen }),
    }),
    { name: "kurdishtcg-cart", partialize: (state) => ({ items: state.items }) }
  )
);

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

/**
 * Refresh each cart line's stock cap from the database while `active`. The
 * cap saved with a line is a snapshot from when it was added (it lives in
 * localStorage), so without this a box restocked down to 2 in the dashboard
 * could still be stepped up to whatever the old stock was.
 */
export function useLiveCartStock(active = true): void {
  const ids = useCartStore((s) => s.items.map((i) => i.productId).sort().join(","));
  useEffect(() => {
    if (!active || !ids) return;
    let cancelled = false;
    (async () => {
      try {
        const productIds = ids.split(",");
        const { data, error } = await getSupabaseClient()
          .from("products")
          .select("id, stock")
          .in("id", productIds);
        if (cancelled || error || !data) return;
        const live = new Map(data.map((r: { id: string; stock: number }) => [r.id, r.stock]));
        const { syncStock } = useCartStore.getState();
        // A product missing from the result was deleted — treat it as sold out.
        for (const id of productIds) syncStock(id, live.get(id) ?? 0);
      } catch {
        // Offline or misconfigured: keep the saved caps; checkout re-checks anyway.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, ids]);
}

const noopSubscribe = () => () => {};

/**
 * Cart quantity that is 0 during SSR and the first client render, then the
 * persisted value. The cart lives in localStorage, so reading it straight
 * away would mismatch the server HTML.
 */
export function useCartCount(): number {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const items = useCartStore((s) => s.items);
  return hydrated ? cartCount(items) : 0;
}
