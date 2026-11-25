"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  ImagePlus,
  Loader2,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { ProductType, Rarity } from "@tcg/types";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/price-tag";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getAccessToken, useSupabaseUser } from "@/lib/use-supabase-user";
import { normalizeIraqiMobile, whatsappLink } from "@/lib/phone";

const PRODUCT_TYPES: ProductType[] = [
  "single_card",
  "booster_pack",
  "booster_box",
  "starter_deck",
  "blaster_box",
  "collection_box",
];
const RARITIES: Rarity[] = ["common", "uncommon", "rare", "holo", "ultra", "secret", "promo"];
/** Stored value → product.conditions.* translation key. Must match lib/listings.ts. */
const CONDITIONS: [string, string][] = [
  ["Near mint", "nearMint"],
  ["Lightly played", "lightlyPlayed"],
  ["Used", "used"],
  ["New", "new"],
  ["Sealed", "sealed"],
];
const MAX_PHOTOS = 4;

const inputClass =
  "w-full border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-base md:text-sm outline-none rounded-[var(--radius-xs)] transition-colors focus-visible:border-[var(--color-accent)]";
const cardClass =
  "rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-[var(--color-border)] bg-[var(--color-surface)]";

interface Listing {
  id: string;
  slug: string;
  franchise_slug: string;
  product_type: ProductType;
  name_en: string;
  description_en: string;
  set_name: string;
  card_number: string | null;
  rarity: Rarity | null;
  price: number;
  condition: string;
  image: string;
  images: string[];
  stock: number;
}

interface SellerOrder {
  id: string;
  status: string;
  createdAt: string;
  buyer: { name: string; phone: string; city: string; address: string; notes: string | null };
  items: { id: string; name: string; image: string | null; quantity: number; unitPrice: number }[];
  total: number;
  sellerPaidAt: string | null;
  buyerReceivedAt: string | null;
}

interface Franchise {
  slug: string;
  name_en: string;
  name_ar: string;
  name_ckb: string;
}

type ApiResult<T> = { ok: boolean; status: number; data: T & { error?: string } };

async function api<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const res = await fetch(path, { ...init, headers }).catch(() => null);
  if (!res) return { ok: false, status: 0, data: { error: "generic" } as T & { error?: string } };
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Shrink a photo to ≤1600px JPEG before upload — phone photos are often 5–10 MB. */
async function shrinkImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

export function SellerSpace() {
  const t = useTranslations("sell");
  const user = useSupabaseUser();

  if (user === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }
  if (!user) return <SignInPrompt />;
  return <SellerDashboard key={user.id} t={t} />;
}

function SignInPrompt() {
  const t = useTranslations("sell");
  async function google() {
    await getSupabaseClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
  }
  return (
    <div className={`${cardClass} flex flex-col items-start gap-4 p-6 md:p-8`}>
      <h2 className="text-xl">{t("signInTitle")}</h2>
      <p className="max-w-[52ch] text-sm text-[var(--color-text-muted)]">{t("signInBody")}</p>
      <Button size="lg" onClick={google}>
        {t("continueWithGoogle")}
      </Button>
      <Link href="/account" className="text-sm text-[var(--color-accent)] hover:underline">
        {t("useEmail")}
      </Link>
    </div>
  );
}

type T = ReturnType<typeof useTranslations<"sell">>;

function errorText(t: T, code: string | undefined): string {
  const known = [
    "missing_fields",
    "bad_price",
    "bad_stock",
    "bad_images",
    "whatsapp_required",
    "has_open_orders",
    "stock_changed",
    "too_large",
    "bad_type",
    "too_many_listings",
    "rate_limited",
  ];
  return code && known.includes(code) ? t(`errors.${code}`) : t("errors.generic");
}

function SellerDashboard({ t }: { t: T }) {
  const [whatsapp, setWhatsapp] = useState<string | null | undefined>(undefined);
  const [sellerName, setSellerName] = useState("");
  const [tab, setTab] = useState<"listings" | "orders">("listings");
  const [listings, setListings] = useState<Listing[] | undefined>(undefined);
  const [orders, setOrders] = useState<SellerOrder[] | undefined>(undefined);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [editing, setEditing] = useState<Listing | "new" | null>(null);
  const [setupError, setSetupError] = useState(false);

  const loadListings = useCallback(async () => {
    const res = await api<{ listings: Listing[] }>("/api/seller/listings");
    if (res.ok) setListings(res.data.listings);
    else {
      setListings([]);
      if (res.status === 500) setSetupError(true);
    }
  }, []);
  const loadOrders = useCallback(async () => {
    const res = await api<{ orders: SellerOrder[] }>("/api/seller/orders");
    setOrders(res.ok ? res.data.orders : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [profile, fr] = await Promise.all([
        api<{ whatsapp: string | null; name: string }>("/api/seller/profile"),
        getSupabaseClient().from("franchises").select("slug, name_en, name_ar, name_ckb").order("sort_order"),
      ]);
      if (cancelled) return;
      setWhatsapp(profile.ok ? profile.data.whatsapp : null);
      setSellerName(profile.ok ? profile.data.name : "");
      setFranchises((fr.data as Franchise[] | null) ?? []);
      await Promise.all([loadListings(), loadOrders()]);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadListings, loadOrders]);

  if (whatsapp === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  const openOrders = orders?.filter(
    (o) => o.status !== "cancelled" && !(o.sellerPaidAt && o.buyerReceivedAt)
  ).length;

  return (
    <div className="flex flex-col gap-8">
      {setupError && (
        <p role="alert" className="text-sm text-[var(--color-accent)]">
          {t("errors.migration")}
        </p>
      )}
      <WhatsAppCard t={t} value={whatsapp} name={sellerName} onSaved={setWhatsapp} />

      <div className="flex items-center gap-2 border-b-[length:var(--border-width)] border-[var(--color-border)]" role="tablist">
        {(["listings", "orders"] as const).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px cursor-pointer border-b-2 px-3 py-2.5 text-sm font-heading font-[var(--font-heading-weight)] transition-colors ${
              tab === key
                ? "border-[var(--color-accent)] text-[var(--color-text)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {key === "listings" ? t("tabListings") : t("tabOrders")}
            {key === "orders" && openOrders ? (
              <span className="ms-2 rounded-[var(--radius-full)] bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] text-[var(--color-accent-ink)]">
                {openOrders}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "listings" ? (
        editing ? (
          <ListingForm
            t={t}
            franchises={franchises}
            listing={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await loadListings();
            }}
          />
        ) : (
          <ListingsPanel
            t={t}
            listings={listings}
            canList={!!whatsapp}
            onNew={() => setEditing("new")}
            onEdit={setEditing}
            onChanged={loadListings}
          />
        )
      ) : (
        <OrdersPanel t={t} orders={orders} onChanged={loadOrders} />
      )}
    </div>
  );
}

function WhatsAppCard({
  t,
  value,
  name,
  onSaved,
}: {
  t: T;
  value: string | null;
  name: string;
  onSaved: (v: string) => void;
}) {
  const [input, setInput] = useState(value ?? "");
  const [state, setState] = useState<"idle" | "busy" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!normalizeIraqiMobile(input)) return setError(t("invalidPhone"));
    setState("busy");
    const res = await api<{ whatsapp: string }>("/api/seller/profile", {
      method: "POST",
      body: JSON.stringify({ whatsapp: input }),
    });
    if (res.ok) {
      onSaved(res.data.whatsapp);
      setInput(res.data.whatsapp);
      setState("saved");
    } else {
      setState("idle");
      setError(res.data.error === "invalid_phone" ? t("invalidPhone") : errorText(t, res.data.error));
    }
  }

  return (
    <form onSubmit={save} className={`${cardClass} flex flex-col gap-3 p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base">{t("whatsappTitle")}</h2>
        {name && <span className="text-xs text-[var(--color-text-muted)]">{name}</span>}
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">{t("whatsappHelp")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label={t("whatsappLabel")}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setState("idle");
          }}
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          placeholder="07xx xxx xxxx"
          className={`${inputClass} max-w-[240px] rtl:text-right`}
        />
        <Button type="submit" variant={value ? "secondary" : "primary"} disabled={state === "busy"}>
          {state === "busy" ? <Loader2 className="size-4 animate-spin" /> : state === "saved" ? <Check className="size-4" /> : null}
          {state === "saved" ? t("saved") : t("save")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-[var(--color-accent)]">
          {error}
        </p>
      )}
    </form>
  );
}

function ListingsPanel({
  t,
  listings,
  canList,
  onNew,
  onEdit,
  onChanged,
}: {
  t: T;
  listings: Listing[] | undefined;
  canList: boolean;
  onNew: () => void;
  onEdit: (l: Listing) => void;
  onChanged: () => Promise<void>;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    const res = await api(`/api/seller/listings/${id}`, { method: "DELETE" });
    setBusyId(null);
    setConfirmId(null);
    if (!res.ok) setError(errorText(t, res.data.error));
    await onChanged();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!canList ? (
          <p className="text-sm text-[var(--color-text-muted)]">{t("errors.whatsapp_required")}</p>
        ) : (
          <span />
        )}
        <Button onClick={onNew} disabled={!canList}>
          <Plus className="size-4" />
          {t("newListing")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-[var(--color-accent)]">
          {error}
        </p>
      )}
      {listings === undefined ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-[var(--color-text-muted)]" />
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-dashed border-[var(--color-border)] px-6 py-12 text-center">
          <Package className="size-8 text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-muted)]">{t("noListings")}</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y-[length:var(--border-width)] divide-[var(--color-border)] overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-[var(--color-border)]">
          {listings.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
              <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-[var(--radius-xs)] bg-[var(--color-neutral-200)]">
                <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link
                  href={`/franchises/${l.franchise_slug}/${l.slug}`}
                  className="truncate font-heading font-[var(--font-heading-weight)] hover:text-[var(--color-accent)]"
                >
                  {l.name_en}
                </Link>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <PriceTag value={Number(l.price)} />
                  <span aria-hidden>·</span>
                  <span className={l.stock === 0 ? "text-[var(--color-accent)]" : ""}>
                    {l.stock === 0 ? t("soldOut") : t("qtyLeft", { count: l.stock })}
                  </span>
                </div>
              </div>
              {confirmId === l.id ? (
                <div className="flex flex-wrap items-center gap-2" role="alertdialog" aria-label={t("deleteConfirm")}>
                  <span className="text-xs">{t("deleteConfirm")}</span>
                  <Button size="sm" onClick={() => remove(l.id)} disabled={busyId === l.id}>
                    {busyId === l.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    {t("deleteYes")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmId(null)}>
                    {t("cancel")}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onEdit(l)}>
                    <Pencil className="size-3.5" />
                    {t("edit")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmId(l.id)} aria-label={t("delete")}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ListingForm({
  t,
  franchises,
  listing,
  onCancel,
  onSaved,
}: {
  t: T;
  franchises: Franchise[];
  listing: Listing | null;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const locale = useLocale();
  const typeT = useTranslations("productType");
  const rarityT = useTranslations("rarity");
  const productT = useTranslations("product");
  const fileRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<string[]>(listing?.images?.length ? listing.images : listing ? [listing.image] : []);
  const [type, setType] = useState<ProductType>(listing?.product_type ?? "single_card");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, MAX_PHOTOS - images.length)) {
        const form = new FormData();
        form.append("file", await shrinkImage(file), "photo.jpg");
        const res = await api<{ url: string }>("/api/seller/upload", { method: "POST", body: form });
        if (!res.ok) {
          setError(errorText(t, res.data.error));
          break;
        }
        setImages((prev) => [...prev, res.data.url].slice(0, MAX_PHOTOS));
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || uploading) return;
    setError(null);
    const f = new FormData(e.currentTarget);
    const body = {
      name: f.get("name"),
      franchise: f.get("franchise"),
      type,
      rarity: type === "single_card" ? f.get("rarity") || null : null,
      condition: f.get("condition"),
      set: f.get("set"),
      cardNumber: f.get("cardNumber"),
      price: Number(f.get("price")),
      stock: Number(f.get("stock")),
      description: f.get("description"),
      images,
      ...(listing ? { seenStock: listing.stock } : {}),
    };
    setBusy(true);
    const res = await api(listing ? `/api/seller/listings/${listing.id}` : "/api/seller/listings", {
      method: listing ? "PATCH" : "POST",
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) return setError(errorText(t, res.data.error));
    await onSaved();
  }

  const franchiseName = (fr: Franchise) =>
    (fr[`name_${locale}` as keyof Franchise] as string) || fr.name_en;
  const label = "flex flex-col gap-1.5 text-sm";
  const hint = "text-xs text-[var(--color-text-muted)]";

  return (
    <form onSubmit={submit} className={`${cardClass} flex flex-col gap-5 p-5 md:p-6`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg">{listing ? t("editListing") : t("newListing")}</h2>
        <button type="button" onClick={onCancel} aria-label={t("cancel")} className="cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          <X className="size-5" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className={hint}>
          {t("photos")} · {t("photosHelp")}
        </span>
        <div className="flex flex-wrap gap-3">
          {images.map((url, i) => (
            <div key={url} className="relative h-28 w-20 overflow-hidden rounded-[var(--radius-xs)] bg-[var(--color-neutral-200)]">
              <Image src={url} alt="" fill sizes="80px" className="object-cover" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                aria-label={t("removePhoto")}
                className="absolute end-1 top-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {images.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-28 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--radius-xs)] border-[length:var(--border-width)] border-dashed border-[var(--color-border-strong)] text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
              {uploading ? t("uploading") : t("addPhoto")}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(e) => addPhotos(e.target.files)}
          />
        </div>
      </div>

      <label className={label}>
        <span className={hint}>{t("name")}</span>
        <input name="name" required maxLength={120} defaultValue={listing?.name_en} placeholder={t("namePlaceholder")} className={inputClass} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          <span className={hint}>{t("franchise")}</span>
          <select name="franchise" required defaultValue={listing?.franchise_slug ?? ""} className={inputClass}>
            <option value="" disabled>
              {t("choose")}
            </option>
            {franchises.map((fr) => (
              <option key={fr.slug} value={fr.slug}>
                {franchiseName(fr)}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          <span className={hint}>{t("type")}</span>
          <select name="type" value={type} onChange={(e) => setType(e.target.value as ProductType)} className={inputClass}>
            {PRODUCT_TYPES.map((pt) => (
              <option key={pt} value={pt}>
                {typeT(pt)}
              </option>
            ))}
          </select>
        </label>
        {type === "single_card" && (
          <label className={label}>
            <span className={hint}>{t("rarity")}</span>
            <select name="rarity" defaultValue={listing?.rarity ?? ""} className={inputClass}>
              <option value="">{t("noRarity")}</option>
              {RARITIES.map((r) => (
                <option key={r} value={r}>
                  {rarityT(r)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={label}>
          <span className={hint}>{t("condition")}</span>
          <select
            name="condition"
            defaultValue={listing?.condition ?? (type === "single_card" ? "Near mint" : "Sealed")}
            className={inputClass}
          >
            {CONDITIONS.map(([value, key]) => (
              <option key={value} value={value}>
                {productT(`conditions.${key}`)}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          <span className={hint}>
            {t("set")} ({t("optional")})
          </span>
          <input name="set" maxLength={80} defaultValue={listing?.set_name === "-" ? "" : listing?.set_name} className={inputClass} />
        </label>
        {type === "single_card" && (
          <label className={label}>
            <span className={hint}>
              {t("cardNumber")} ({t("optional")})
            </span>
            <input name="cardNumber" maxLength={30} dir="ltr" defaultValue={listing?.card_number ?? ""} className={`${inputClass} rtl:text-right`} />
          </label>
        )}
        <label className={label}>
          <span className={hint}>{t("price")}</span>
          <input
            name="price"
            type="number"
            required
            min={250}
            step={250}
            inputMode="numeric"
            dir="ltr"
            defaultValue={listing ? Number(listing.price) : undefined}
            className={`${inputClass} rtl:text-right`}
          />
        </label>
        <label className={label}>
          <span className={hint}>{t("quantity")}</span>
          <input
            name="stock"
            type="number"
            required
            min={0}
            max={999}
            inputMode="numeric"
            dir="ltr"
            defaultValue={listing?.stock ?? 1}
            className={`${inputClass} rtl:text-right`}
          />
        </label>
      </div>

      <label className={label}>
        <span className={hint}>
          {t("description")} ({t("optional")})
        </span>
        <textarea name="description" rows={3} maxLength={2000} defaultValue={listing?.description_en} className={inputClass} />
      </label>

      {error && (
        <p role="alert" className="text-sm text-[var(--color-accent)]">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={busy || uploading || images.length === 0}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {listing ? t("saveChanges") : t("publish")}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}

function OrdersPanel({
  t,
  orders,
  onChanged,
}: {
  t: T;
  orders: SellerOrder[] | undefined;
  onChanged: () => Promise<void>;
}) {
  const locale = useLocale();
  const statusT = useTranslations("orderStatus");
  const checkoutT = useTranslations("checkout");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markPaid(orderId: string) {
    setBusyId(orderId);
    setError(null);
    const res = await api("/api/orders/confirm", {
      method: "POST",
      body: JSON.stringify({ orderId, role: "seller" }),
    });
    setBusyId(null);
    setConfirmId(null);
    if (!res.ok) setError(errorText(t, res.data.error));
    await onChanged();
  }

  if (orders === undefined) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-5 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-dashed border-[var(--color-border)] px-6 py-12 text-center">
        <Package className="size-8 text-[var(--color-text-muted)]" />
        <p className="max-w-[44ch] text-sm text-[var(--color-text-muted)]">{t("noOrders")}</p>
      </div>
    );
  }

  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-[var(--color-accent)]">
          {error}
        </p>
      )}
      {orders.map((o) => {
        const ref = `#${o.id.slice(0, 8).toUpperCase()}`;
        const cancelled = o.status === "cancelled";
        const done = !!(o.sellerPaidAt && o.buyerReceivedAt);
        const items = o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ");
        return (
          <article key={o.id} className={`${cardClass} flex flex-col gap-4 p-5 ${cancelled ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-base" dir="ltr">
                  {ref}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">{dateFmt.format(new Date(o.createdAt))}</p>
              </div>
              <span className="rounded-[var(--radius-full)] border border-[var(--color-border-strong)] px-2.5 py-0.5 text-xs">
                {done ? t("completed") : statusT(o.status)}
              </span>
            </div>

            <ul className="flex flex-col gap-2">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 text-sm">
                  <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-[var(--radius-xs)] bg-[var(--color-neutral-200)]">
                    {i.image ? (
                      <Image src={i.image} alt="" fill sizes="36px" className="object-cover" />
                    ) : (
                      <Package className="absolute inset-0 m-auto size-4 text-[var(--color-text-muted)]" />
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate">{i.name}</span>
                  <span className="text-xs text-[var(--color-text-muted)]" dir="ltr">
                    × {i.quantity}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t-[length:var(--border-width)] border-[var(--color-border)] pt-3 text-sm">
              <span className="text-[var(--color-text-muted)]">{checkoutT("total")}</span>
              <PriceTag value={o.total} />
            </div>

            {cancelled ? (
              <p className="text-xs text-[var(--color-text-muted)]">{t("cancelledOrder")}</p>
            ) : (
              <>
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-[var(--color-text-muted)]">{t("buyer")}</span>
                  <span className="font-heading font-[var(--font-heading-weight)]">{o.buyer.name}</span>
                  <span dir="ltr" className="rtl:text-right">
                    {o.buyer.phone}
                  </span>
                  <span className="text-[var(--color-text-muted)]">
                    {o.buyer.city} · {o.buyer.address}
                  </span>
                  {o.buyer.notes && <span className="text-xs text-[var(--color-text-muted)]">“{o.buyer.notes}”</span>}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {o.buyer.phone && (
                    <Button asChild variant="secondary" size="sm">
                      <a
                        href={whatsappLink(o.buyer.phone, t("waMessage", { name: o.buyer.name, ref, items }))}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="size-3.5" />
                        {t("chatBuyer")}
                      </a>
                    </Button>
                  )}
                  {o.sellerPaidAt ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-accent-secondary)]">
                      <Check className="size-3.5" /> {t("paidDone")}
                    </span>
                  ) : confirmId === o.id ? (
                    <div className="flex flex-wrap items-center gap-2" role="alertdialog" aria-label={t("markPaid")}>
                      <span className="text-xs">{t("markPaidPrompt")}</span>
                      <Button size="sm" onClick={() => markPaid(o.id)} disabled={busyId === o.id}>
                        {busyId === o.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                        {t("markPaid")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirmId(null)}>
                        {t("cancel")}
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => setConfirmId(o.id)}>
                      {t("markPaid")}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {done ? t("completedNote") : o.buyerReceivedAt ? t("buyerConfirmed") : t("waitingBuyer")}
                </p>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
