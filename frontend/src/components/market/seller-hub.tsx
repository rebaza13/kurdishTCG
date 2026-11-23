"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Eye, Loader2, MapPin, MessageCircle, Pause, Phone, Play, Plus, Store, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/market/listing-card";
import { SellerProfileForm } from "@/components/market/seller-profile-form";
import { SignInPrompt } from "@/components/market/sign-in-prompt";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/use-supabase-user";
import { cityName } from "@/lib/iraq-cities";
import { formatPrice } from "@/lib/utils";
import {
  chatLinks,
  LISTING_COLUMNS,
  mapListingRow,
  type Listing,
  type MarketOrder,
  type MarketOrderStatus,
  type SellerProfile,
} from "@/lib/market";

export type HubTab = "listings" | "orders" | "profile";

const NEXT: Partial<Record<MarketOrderStatus, MarketOrderStatus>> = {
  requested: "confirmed",
  confirmed: "shipped",
  shipped: "delivered",
};

export function SellerHub({ initialTab }: { initialTab: HubTab }) {
  const t = useTranslations("seller");
  const user = useSupabaseUser();
  const [tab, setTab] = useState<HubTab>(initialTab);
  const [profile, setProfile] = useState<SellerProfile | null | undefined>(undefined);
  const [listings, setListings] = useState<Listing[] | undefined>(undefined);
  const [orders, setOrders] = useState<MarketOrder[] | undefined>(undefined);

  // Bumped after every change (status, delete, …) to refetch.
  const [version, setVersion] = useState(0);
  const load = useCallback(() => setVersion((v) => v + 1), []);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const db = getSupabaseClient();
    Promise.all([
      db.from("seller_profiles").select("user_id, display_name, phone, contact_channel, city, address").eq("user_id", userId).maybeSingle(),
      db.from("listings").select(LISTING_COLUMNS).eq("seller_id", userId).order("created_at", { ascending: false }),
      db.from("listing_orders").select("*").eq("seller_id", userId).order("created_at", { ascending: false }),
    ]).then(([p, l, o]) => {
      if (cancelled) return;
      setProfile((p.data as SellerProfile | null) ?? null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setListings(((l.data as any[]) ?? []).map(mapListingRow));
      setOrders((o.data as MarketOrder[] | null) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, version]);

  if (user === null) return <SignInPrompt />;
  if (user === undefined || profile === undefined) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  const newOrders = orders?.filter((o) => o.status === "requested").length ?? 0;

  function selectTab(next: HubTab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-10 md:py-14 flex flex-col gap-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-accent)]">{t("kicker")}</span>
          <h1 className="text-3xl md:text-5xl">{profile?.display_name ?? t("title")}</h1>
          {profile && (
            <p className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
              <MapPin className="size-4 text-[var(--color-accent)]" />
              <CityLabel code={profile.city} />
            </p>
          )}
        </div>
        <Button asChild size="lg" className="self-start sm:self-auto">
          <Link href="/sell/new">
            <Plus className="size-4" strokeWidth={2.6} />
            {t("newListing")}
          </Link>
        </Button>
      </header>

      <div className="kt-mk-tabs self-start" role="tablist">
        {(["listings", "orders", "profile"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => selectTab(k)}>
            {t(`tabs.${k}`)}
            {k === "orders" && newOrders > 0 && <span className="kt-mk-badge">{newOrders}</span>}
            {k === "listings" && listings && listings.length > 0 && (
              <span className="font-mono text-xs text-[var(--color-text-muted)]">{listings.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "listings" && <ListingsTab listings={listings} onChange={load} />}
      {tab === "orders" && <OrdersTab orders={orders} onChange={load} />}
      {tab === "profile" &&
        (profile ? (
          <section className="flex flex-col gap-6">
            <h2 className="text-2xl">{t("profileEditTitle")}</h2>
            <SellerProfileForm userId={user.id} initial={profile} onSaved={(p) => setProfile(p)} submitLabel={t("saveChanges")} />
          </section>
        ) : (
          <section className="flex flex-col gap-6">
            <div className="flex max-w-[62ch] flex-col gap-2">
              <h2 className="text-2xl">{t("profileTitle")}</h2>
              <p className="text-[var(--color-text-muted)]">{t("profileBody")}</p>
            </div>
            <SellerProfileForm userId={user.id} onSaved={(p) => setProfile(p)} submitLabel={t("saveProfile")} />
          </section>
        ))}
    </div>
  );
}

function CityLabel({ code }: { code: string }) {
  const locale = useLocale();
  return <>{cityName(code, locale)}</>;
}

function Empty({ text, cta }: { text: string; cta?: boolean }) {
  const t = useTranslations("seller");
  return (
    <div className="kt-mk-panel flex flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-[var(--color-chip)]">
        <Store className="size-6 text-[var(--color-accent)]" />
      </span>
      <p className="max-w-[44ch] text-[var(--color-text-muted)]">{text}</p>
      {cta && (
        <Button asChild>
          <Link href="/sell/new">
            <Plus className="size-4" />
            {t("newListing")}
          </Link>
        </Button>
      )}
    </div>
  );
}

function ListingsTab({ listings, onChange }: { listings: Listing[] | undefined; onChange: () => void }) {
  const t = useTranslations("seller");
  const [pending, setPending] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!listings) return <Loader2 className="mx-auto size-5 animate-spin text-[var(--color-text-muted)]" />;
  if (listings.length === 0) return <Empty text={t("noListings")} cta />;

  async function setStatus(id: string, status: "active" | "paused") {
    setPending(id);
    await getSupabaseClient().from("listings").update({ status }).eq("id", id);
    setPending(null);
    onChange();
  }

  async function remove(id: string) {
    setPending(id);
    await getSupabaseClient().from("listings").delete().eq("id", id);
    setPending(null);
    setConfirmDelete(null);
    onChange();
  }

  return (
    <div className="kt-lcard-grid">
      {listings.map((l) => (
        <div key={l.id} className="flex flex-col gap-2">
          <ListingCard
            listing={l}
            footer={
              <span className="kt-mk-status" data-status={l.status}>
                {t(`statuses.${l.status}`)}
                {l.status === "active" && l.kind !== "bundle" && l.quantity > 1 ? ` · ${t("left", { count: l.quantity })}` : ""}
              </span>
            }
          />
          <div className="flex items-center gap-1.5">
            <IconAction href={`/market/${l.id}`} label={t("viewListing")}>
              <Eye className="size-4" />
            </IconAction>
            {l.status !== "sold" && (
              <IconAction
                label={l.status === "active" ? t("pause") : t("activate")}
                disabled={pending === l.id}
                onClick={() => setStatus(l.id, l.status === "active" ? "paused" : "active")}
              >
                {l.status === "active" ? <Pause className="size-4" /> : <Play className="size-4" />}
              </IconAction>
            )}
            {confirmDelete === l.id ? (
              <button
                type="button"
                disabled={pending === l.id}
                onClick={() => remove(l.id)}
                onBlur={() => setConfirmDelete(null)}
                autoFocus
                className="ms-auto rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent-ink)] cursor-pointer"
              >
                {t("confirmDelete")}
              </button>
            ) : (
              <IconAction label={t("delete")} className="ms-auto" onClick={() => setConfirmDelete(l.id)}>
                <Trash2 className="size-4" />
              </IconAction>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function IconAction({
  children,
  label,
  href,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const cls = `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] transition-colors hover:text-[var(--color-text)] hover:ring-[var(--color-border-strong)] disabled:opacity-50 cursor-pointer ${className}`;
  if (href)
    return (
      <Link href={href as `/${string}`} className={cls}>
        {children}
        {label}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {children}
      {label}
    </button>
  );
}

function OrdersTab({ orders, onChange }: { orders: MarketOrder[] | undefined; onChange: () => void }) {
  const t = useTranslations("seller");
  const marketT = useTranslations("market");
  const locale = useLocale();
  const [pending, setPending] = useState<string | null>(null);

  if (!orders) return <Loader2 className="mx-auto size-5 animate-spin text-[var(--color-text-muted)]" />;
  if (orders.length === 0) return <Empty text={t("noOrders")} />;

  async function setStatus(id: string, status: MarketOrderStatus) {
    setPending(id);
    await getSupabaseClient().from("listing_orders").update({ status }).eq("id", id);
    setPending(null);
    onChange();
  }

  const dateFmt = new Intl.DateTimeFormat(locale === "ckb" ? "ckb-IQ" : locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <ul className="flex flex-col gap-4">
      {orders.map((o) => {
        const next = NEXT[o.status];
        const links = chatLinks(o.buyer_phone);
        return (
          <li key={o.id} className="kt-mk-panel flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
            <div className="relative aspect-[63/88] w-20 shrink-0 overflow-hidden rounded-[10px] bg-[var(--color-chip)]">
              {o.listing_cover && <Image src={o.listing_cover} alt="" fill sizes="80px" className="object-cover" />}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {o.listing_title} <span className="font-mono text-[var(--color-text-muted)]">× {o.quantity}</span>
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    <span dir="ltr" className="font-mono">#{o.id.slice(0, 8).toUpperCase()}</span> · {dateFmt.format(new Date(o.created_at))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="kt-mk-status" data-status={o.status}>
                    {t(`orderStatus.${o.status}`)}
                  </span>
                  <span className="font-mono font-bold">{formatPrice(Number(o.total), locale)}</span>
                </div>
              </div>

              <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-[var(--color-text-muted)]">{t("buyer")}: </span>
                  {o.buyer_name}
                </p>
                <p dir="ltr" className="font-mono rtl:text-right">{o.buyer_phone}</p>
                <p className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5 text-[var(--color-accent)]" />
                  {cityName(o.buyer_city, locale)} — {o.buyer_address}
                </p>
                {o.notes && <p className="text-[var(--color-text-muted)]">“{o.notes}”</p>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a href={`tel:${o.buyer_phone}`} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-[var(--color-border)] hover:ring-[var(--color-border-strong)]">
                  <Phone className="size-3.5" />
                  {t("call")}
                </a>
                <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-[var(--color-border)] hover:ring-[var(--color-border-strong)]">
                  <MessageCircle className="size-3.5" />
                  {marketT("whatsapp")}
                </a>
                <a href={links.viber} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-[var(--color-border)] hover:ring-[var(--color-border-strong)]">
                  <Phone className="size-3.5" />
                  {marketT("viber")}
                </a>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {t(`notified.${o.notify_status}`, { channel: o.notify_channel ? marketT(o.notify_channel) : "" })}
                </span>
                <span className="flex-1" />
                {o.status !== "delivered" && o.status !== "cancelled" && (
                  <button
                    type="button"
                    disabled={pending === o.id}
                    onClick={() => setStatus(o.id, "cancelled")}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-accent)] cursor-pointer"
                  >
                    {t("cancelOrder")}
                  </button>
                )}
                {next && (
                  <Button size="sm" disabled={pending === o.id} onClick={() => setStatus(o.id, next)}>
                    {pending === o.id && <Loader2 className="size-3.5 animate-spin" />}
                    {t(`nextStatus.${o.status as "requested" | "confirmed" | "shipped"}`)}
                  </Button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
