"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MapPin, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { cityName } from "@/lib/iraq-cities";
import { chatLinks, type MarketOrder } from "@/lib/market";
import { formatPrice } from "@/lib/utils";

/** Account page: the marketplace orders this customer placed with sellers. */
export function BuyerOrders({ userId }: { userId: string }) {
  const t = useTranslations("market");
  const sellerT = useTranslations("seller");
  const locale = useLocale();
  const [orders, setOrders] = useState<MarketOrder[]>([]);

  const load = useCallback(() => {
    getSupabaseClient()
      .from("listing_orders")
      .select("*")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as MarketOrder[] | null) ?? []));
  }, [userId]);
  useEffect(load, [load]);

  if (orders.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg">{t("myOrders")}</h2>
      <ul className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
        {orders.map((o) => (
          <li key={o.id} className="flex items-center gap-3 px-4 py-3">
            <div className="relative aspect-[63/88] w-11 shrink-0 overflow-hidden rounded-[6px] bg-[var(--color-chip)]">
              {o.listing_cover && <Image src={o.listing_cover} alt="" fill sizes="44px" className="object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              {o.listing_id ? (
                <Link href={`/market/${o.listing_id}`} className="block truncate text-sm font-semibold hover:underline">
                  {o.listing_title}
                </Link>
              ) : (
                <p className="truncate text-sm font-semibold">{o.listing_title}</p>
              )}
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <span className="kt-mk-status" data-status={o.status}>
                  {sellerT(`orderStatus.${o.status}`)}
                </span>
                {o.seller_name}
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="size-3" />
                  {cityName(o.buyer_city, locale)}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="font-mono text-sm font-bold">{formatPrice(Number(o.total), locale)}</span>
              <div className="flex items-center gap-2 text-xs">
                <a href={chatLinks(o.seller_phone).whatsapp} target="_blank" rel="noopener noreferrer" aria-label={t("messageOn", { channel: t("whatsapp") })} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                  <MessageCircle className="size-4" />
                </a>
                {o.status === "requested" && (
                  <button
                    type="button"
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] cursor-pointer"
                    onClick={async () => {
                      await getSupabaseClient().from("listing_orders").update({ status: "cancelled" }).eq("id", o.id);
                      load();
                    }}
                  >
                    {sellerT("cancelOrder")}
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
