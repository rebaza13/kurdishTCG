"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Check, Layers, Loader2, MapPin, MessageCircle, Package, Phone, ShieldCheck, Store } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { FlipCard } from "@/components/market/flip-card";
import { CityMap } from "@/components/map/city-map";
import { cityName, isCityCode, type CityCode } from "@/lib/iraq-cities";
import { chatLinks, type Listing } from "@/lib/market";
import { normalizeIraqiMobile } from "@/lib/phone";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getAccessToken, useSupabaseUser } from "@/lib/use-supabase-user";
import { formatPrice } from "@/lib/utils";

type Placed = {
  orderId: string;
  sellerName: string;
  sellerPhone: string;
  channel: "whatsapp" | "viber" | null;
  notifyStatus: string;
  message?: string;
};

const BUYER_KEY = "kt-market-buyer";

export function ListingDetail({ listing, franchiseName }: { listing: Listing; franchiseName: string | null }) {
  const t = useTranslations("market");
  const locale = useLocale();
  const accountT = useTranslations("account");
  const user = useSupabaseUser();

  const [active, setActive] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = listing.cards[active] ?? listing.cards[0];
  const multi = listing.cards.length > 1;

  const [city, setCity] = useState<CityCode | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [saved, setSaved] = useState<{ fullName?: string; phone?: string; address?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [cityError, setCityError] = useState(false);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const attemptRef = useRef<string | null>(null);
  const orderRef = useRef<HTMLElement>(null);

  // Remember the buyer's details on this device (convenience only).
  // Read after hydration (the server can't see localStorage).
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(BUYER_KEY);
        if (!raw) return;
        const v = JSON.parse(raw);
        setSaved(v);
        if (isCityCode(v.city)) setCity(v.city);
      } catch {}
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const isOwn = user?.id === listing.sellerId;
  const available = listing.status === "active" && listing.quantity > 0;
  const total = listing.price * quantity;

  async function signInWithGoogle() {
    await getSupabaseClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setPhoneError(null);
    if (!city) {
      setCityError(true);
      setError(t("pickCity"));
      document.getElementById("delivery-map")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const form = new FormData(e.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim() || null;
    const phone = normalizeIraqiMobile(String(form.get("phone") ?? ""));
    if (!phone) {
      setPhoneError(t("phoneInvalid"));
      (e.currentTarget.elements.namedItem("phone") as HTMLInputElement | null)?.focus();
      return;
    }

    setSubmitting(true);
    attemptRef.current ??= crypto.randomUUID();
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/market/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          orderId: attemptRef.current,
          listingId: listing.id,
          quantity,
          fullName,
          phone,
          city,
          address,
          notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        attemptRef.current = null;
        setError(
          data.error === "out_of_stock"
            ? t("outOfStock")
            : data.error === "unavailable"
              ? t("unavailable")
              : data.error === "invalid_phone"
                ? t("phoneInvalid")
                : data.error === "own_listing"
                  ? t("ownListing")
                  : t("orderError")
        );
        return;
      }
      try {
        localStorage.setItem(BUYER_KEY, JSON.stringify({ fullName, phone, address, city }));
      } catch {}
      setPlaced(data as Placed);
      window.scrollTo({ top: orderRef.current?.offsetTop ? orderRef.current.offsetTop - 90 : 0, behavior: "smooth" });
    } catch {
      setError(t("orderError"));
    } finally {
      setSubmitting(false);
    }
  }

  const dateFmt = new Intl.DateTimeFormat(locale === "ckb" ? "ckb-IQ" : locale, { dateStyle: "medium" });
  const accent = listing.franchise ? `var(--color-${listing.franchise}, var(--color-accent))` : "var(--color-accent)";

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-8 md:px-10 md:py-12 flex flex-col gap-12">
      <Link href="/market" className="inline-flex items-center gap-2 self-start text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
        <ArrowLeft className="size-4 rtl:-scale-x-100" />
        {t("backToMarket")}
      </Link>

      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
        {/* Gallery */}
        <div className="flex flex-col items-center gap-5">
          <div
            className="relative grid w-full place-items-center rounded-[var(--radius-lg)] px-6 py-10 md:py-14"
            style={{
              background: `radial-gradient(70% 60% at 50% 40%, color-mix(in oklab, ${accent} 22%, transparent), transparent 70%), var(--color-chip)`,
            } as CSSProperties}
          >
            <div className="w-full max-w-[340px]">
              <FlipCard
                key={active}
                front={card.front}
                back={card.back}
                alt={card.name || listing.title}
                sizes="(max-width: 1024px) 80vw, 340px"
                priority
                tilt
                hoverFlip={false}
                flipped={flipped}
                onFlippedChange={setFlipped}
              />
            </div>
            {card.back && (
              <div className="kt-mk-tabs mt-6" role="tablist">
                <button type="button" role="tab" aria-selected={!flipped} onClick={() => setFlipped(false)}>
                  {t("showFront")}
                </button>
                <button type="button" role="tab" aria-selected={flipped} onClick={() => setFlipped(true)}>
                  {t("showBack")}
                </button>
              </div>
            )}
            {multi && (
              <span className="absolute top-4 start-4 font-mono text-xs text-[var(--color-text-muted)]">
                {t("cardOf", { n: active + 1, total: listing.cards.length })}
              </span>
            )}
          </div>

          {multi && (
            <div className="flex w-full gap-2.5 overflow-x-auto pb-2" role="list">
              {listing.cards.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  role="listitem"
                  onClick={() => {
                    setActive(i);
                    setFlipped(false);
                  }}
                  aria-label={c.name || t("cardOf", { n: i + 1, total: listing.cards.length })}
                  aria-current={i === active || undefined}
                  className="relative aspect-[63/88] w-[64px] shrink-0 overflow-hidden rounded-[10px] opacity-60 ring-1 ring-[var(--color-border)] transition hover:opacity-100 aria-[current=true]:opacity-100 aria-[current=true]:ring-2 aria-[current=true]:ring-[var(--color-accent)] cursor-pointer"
                >
                  <Image src={c.front} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="kt-mk-status" data-status={listing.status}>
              {listing.kind === "bundle" ? (
                <>
                  <Layers className="size-3" /> {t("bundleOf", { count: listing.cardCount })}
                </>
              ) : (
                t(`kind.${listing.kind}`)
              )}
            </span>
            {franchiseName && <span className="kt-mk-status">{franchiseName}</span>}
            {listing.status === "sold" && <span className="kt-mk-status" data-status="sold">{t("sold")}</span>}
          </div>
          <h1 className="text-3xl md:text-5xl">{listing.title}</h1>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-mono text-3xl font-bold">{formatPrice(listing.price, locale)}</span>
            <span className="text-sm text-[var(--color-text-muted)]">{t("cashOnDelivery")}</span>
          </div>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-border)] text-sm">
            {[
              [t("conditionLabel"), t(`condition.${listing.condition}`)],
              [t("cards"), String(listing.kind === "single" ? 1 : listing.cardCount)],
              [t("details"), available ? t("available", { count: listing.quantity }) : t("sold")],
              [t("listed"), dateFmt.format(new Date(listing.createdAt))],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1 bg-[var(--color-surface)] px-4 py-3">
                <dt className="text-xs text-[var(--color-text-muted)]">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="kt-mk-panel flex items-center gap-4 p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--color-text)] text-[var(--color-bg)]">
              <Store className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--color-text-muted)]">{t("soldBy")}</p>
              <p className="truncate font-semibold">{listing.sellerName}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm">
              <MapPin className="size-4 text-[var(--color-accent)]" />
              {cityName(listing.sellerCity, locale)}
            </span>
          </div>

          {listing.description && (
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-[var(--color-text-muted)]">
              {listing.description}
            </p>
          )}

          {available && !isOwn && (
            <Button
              size="lg"
              className="justify-center"
              onClick={() => orderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <Package className="size-4" />
              {t("orderNow")}
            </Button>
          )}
          {isOwn && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("ownListing")}{" "}
              <Link href="/sell" className="text-[var(--color-accent)] underline-offset-2 hover:underline">
                {t("manageListing")}
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* Order */}
      {(available || placed) && !isOwn && (
        <section ref={orderRef} id="order" className="scroll-mt-24 flex flex-col gap-6">
          {placed ? (
            <OrderPlaced placed={placed} />
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl md:text-4xl">{t("deliveryTitle")}</h2>
                <p className="max-w-[60ch] text-[var(--color-text-muted)]">{t("deliveryBody")}</p>
              </div>
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
                <div id="delivery-map">
                  <CityMap
                    value={city}
                    origin={listing.sellerCity}
                    invalid={cityError}
                    onChange={(c) => {
                      setCity(c);
                      setCityError(false);
                      if (error === t("pickCity")) setError(null);
                    }}
                  />
                </div>

                {user === undefined ? (
                  <div className="grid place-items-center py-16">
                    <Loader2 className="size-5 animate-spin text-[var(--color-text-muted)]" />
                  </div>
                ) : !user ? (
                  <div className="kt-mk-panel flex flex-col gap-4 self-start p-6">
                    <ShieldCheck className="size-7 text-[var(--color-accent)]" />
                    <h3 className="text-xl">{t("signInToOrder")}</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">{t("signInToOrderBody")}</p>
                    <Button size="lg" className="justify-center" onClick={signInWithGoogle}>
                      {accountT("continueWithGoogle")}
                    </Button>
                    <Button asChild variant="secondary" size="lg" className="justify-center">
                      <Link href="/account">{t("signInToOrder")}</Link>
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={submit} className="kt-mk-panel flex flex-col gap-4 self-start p-5 md:p-6" noValidate>
                    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--color-chip)] px-4 py-3 text-sm">
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="size-4 text-[var(--color-accent)]" />
                        {city ? <strong>{cityName(city, locale)}</strong> : <span className="text-[var(--color-text-muted)]">{t("pickCity")}</span>}
                      </span>
                      {city && <Check className="size-4 text-[var(--color-accent-tertiary)]" strokeWidth={3} />}
                    </div>
                    <h3 className="text-lg">{t("yourDetails")}</h3>
                    <Field label={t("fullName")}>
                      <input name="fullName" required minLength={2} maxLength={120} autoComplete="name" defaultValue={saved.fullName} key={`n${saved.fullName}`} className="kt-mk-input" />
                    </Field>
                    <Field label={t("phone")} hint={phoneError ?? t("phoneHint")} error={!!phoneError}>
                      <input
                        name="phone"
                        required
                        type="tel"
                        inputMode="tel"
                        dir="ltr"
                        autoComplete="tel"
                        placeholder="0750 123 4567"
                        defaultValue={saved.phone}
                        key={`p${saved.phone}`}
                        aria-invalid={phoneError ? true : undefined}
                        className="kt-mk-input rtl:text-right"
                      />
                    </Field>
                    <Field label={t("address")}>
                      <input name="address" required minLength={3} maxLength={500} autoComplete="street-address" placeholder={t("addressPlaceholder")} defaultValue={saved.address} key={`a${saved.address}`} className="kt-mk-input" />
                    </Field>
                    <Field label={t("notes")}>
                      <textarea name="notes" rows={2} maxLength={1000} className="kt-mk-input resize-none" />
                    </Field>
                    {listing.quantity > 1 && (
                      <Field label={t("quantity")}>
                        <input
                          type="number"
                          min={1}
                          max={Math.min(listing.quantity, 99)}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, Math.min(Number(e.target.value) || 1, listing.quantity, 99)))}
                          className="kt-mk-input w-28"
                        />
                      </Field>
                    )}
                    <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
                      <span className="text-sm text-[var(--color-text-muted)]">{t("total")}</span>
                      <span className="font-mono text-xl font-bold">{formatPrice(total, locale)}</span>
                    </div>
                    {error && (
                      <p role="alert" className="text-sm text-[var(--color-accent)]">
                        {error}
                      </p>
                    )}
                    <Button type="submit" size="lg" className="justify-center" disabled={submitting}>
                      {submitting ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
                      {t("placeOrder")}
                    </Button>
                  </form>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-medium text-[var(--color-text-muted)]">{label}</span>
      {children}
      {hint && (
        <span role={error ? "alert" : undefined} className={`text-xs ${error ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"}`}>
          {hint}
        </span>
      )}
    </label>
  );
}

function OrderPlaced({ placed }: { placed: Placed }) {
  const t = useTranslations("market");
  const links = chatLinks(placed.sellerPhone, placed.message);
  const notified = placed.notifyStatus === "sent" && placed.channel;

  return (
    <div className="kt-mk-panel reveal mx-auto flex w-full max-w-[640px] flex-col items-center gap-5 px-6 py-10 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-ink)]">
        <Check className="size-8" strokeWidth={3} />
      </span>
      <h2 className="text-2xl md:text-3xl">{t("placedTitle", { name: placed.sellerName })}</h2>
      <p className="max-w-[46ch] text-[var(--color-text-muted)]">
        {notified ? t("placedBody", { channel: t(placed.channel!) }) : t("placedBodyManual")}
      </p>
      <p className="font-mono text-xs text-[var(--color-text-muted)]" dir="ltr">
        {t("orderRef")} #{placed.orderId.slice(0, 8).toUpperCase()}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild size="lg" variant={notified ? "secondary" : "primary"}>
          <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4" />
            {t("messageOn", { channel: t("whatsapp") })}
          </a>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <a href={links.viber}>
            <Phone className="size-4" />
            {t("messageOn", { channel: t("viber") })}
          </a>
        </Button>
      </div>
      <Link href="/market" className="text-sm text-[var(--color-accent)] underline-offset-2 hover:underline">
        {t("keepBrowsing")}
      </Link>
    </div>
  );
}
