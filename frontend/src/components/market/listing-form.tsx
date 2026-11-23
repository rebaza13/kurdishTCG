"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Layers, Loader2, Package, Plus, Square, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/market/listing-card";
import { getSupabaseClient } from "@/lib/supabase/client";
import { uploadListingImage } from "@/lib/upload-listing-image";
import { LISTING_CONDITIONS, type ListingCondition, type ListingKind, type SellerProfile } from "@/lib/market";

type Slot = { front: string | null; back: string | null; name: string };
const emptySlot = (): Slot => ({ front: null, back: null, name: "" });
const MAX_CARDS = 30;

export function ListingForm({
  userId,
  profile,
  franchises,
}: {
  userId: string;
  profile: SellerProfile;
  franchises: { slug: string; name: string }[];
}) {
  const t = useTranslations("seller");
  const marketT = useTranslations("market");
  const router = useRouter();

  const [kind, setKind] = useState<ListingKind>("single");
  const [slots, setSlots] = useState<Slot[]>([emptySlot()]);
  const [title, setTitle] = useState("");
  const [franchise, setFranchise] = useState("");
  const [condition, setCondition] = useState<ListingCondition>("near_mint");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cardCount, setCardCount] = useState(10);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  function chooseKind(k: ListingKind) {
    setKind(k);
    if (k !== "bundle") setSlots((s) => [s[0] ?? emptySlot()]);
    if (k === "pack") setCondition("sealed");
    else if (condition === "sealed") setCondition("near_mint");
  }

  async function upload(index: number, side: "front" | "back", file: File) {
    const key = `${index}-${side}`;
    setError(null);
    setBusy((b) => new Set(b).add(key));
    try {
      const url = await uploadListingImage(file, userId);
      setSlots((s) => s.map((slot, i) => (i === index ? { ...slot, [side]: url } : slot)));
    } catch {
      setError(t("uploadError"));
    } finally {
      setBusy((b) => {
        const n = new Set(b);
        n.delete(key);
        return n;
      });
    }
  }

  const priceNum = Number(String(price).replace(/[^\d]/g, ""));
  const filled = slots.filter((s) => s.front);
  const effectiveCount = kind === "bundle" ? Math.max(cardCount, filled.length || 1) : 1;

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (publishing) return;
    setError(null);
    if (slots.some((s) => !s.front) || filled.length === 0) return setError(t("needFront"));
    if (!Number.isFinite(priceNum) || priceNum < 250) return setError(t("invalidPrice"));
    if (busy.size > 0) return;

    setPublishing(true);
    const { data, error } = await getSupabaseClient()
      .from("listings")
      .insert({
        kind,
        title: title.trim(),
        description: description.trim(),
        franchise_slug: franchise || null,
        condition,
        price: priceNum,
        quantity: kind === "bundle" ? 1 : quantity,
        card_count: effectiveCount,
        cards: slots.map((s) => ({ front: s.front, back: s.back || null, name: s.name.trim() || null })),
      })
      .select("id")
      .single();
    setPublishing(false);
    if (error || !data) {
      setError(t("genericError"));
      return;
    }
    router.push(`/market/${data.id}`);
  }

  const kinds = [
    ["single", Square],
    ["pack", Package],
    ["bundle", Layers],
  ] as const;

  return (
    <form onSubmit={publish} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
      <div className="flex flex-col gap-10">
        {/* Kind */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl">{t("whatSelling")}</h2>
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup">
            {kinds.map(([k, Icon]) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => chooseKind(k)} className="kt-mk-choice">
                <Icon className="size-5 text-[var(--color-accent)]" strokeWidth={2.2} />
                <span className="font-semibold">{marketT(`kind.${k}`)}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{marketT(`kindHint.${k}`)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Photos */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl">{t("photos")}</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              {kind === "single" ? t("photosHintSingle") : kind === "pack" ? t("photosHintPack") : t("photosHintBundle")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {slots.map((slot, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 ring-1 ring-[var(--color-border)]">
                <div className="grid grid-cols-2 gap-2">
                  {(["front", "back"] as const).map((side) => (
                    <PhotoDrop
                      key={side}
                      label={side === "front" ? t("front") : t("back")}
                      required={side === "front"}
                      url={slot[side]}
                      busy={busy.has(`${i}-${side}`)}
                      onFile={(f) => upload(i, side, f)}
                      onClear={() => setSlots((s) => s.map((x, j) => (j === i ? { ...x, [side]: null } : x)))}
                      addLabel={t("addPhoto")}
                      removeLabel={t("remove")}
                      busyLabel={t("uploading")}
                    />
                  ))}
                </div>
                {kind === "bundle" && (
                  <div className="flex items-center gap-2">
                    <input
                      value={slot.name}
                      maxLength={80}
                      onChange={(e) => setSlots((s) => s.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      placeholder={t("cardName")}
                      className="kt-mk-input !py-2 !text-xs"
                    />
                    {slots.length > 1 && (
                      <button
                        type="button"
                        aria-label={t("remove")}
                        onClick={() => setSlots((s) => s.filter((_, j) => j !== i))}
                        className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-chip)] hover:text-[var(--color-accent)] cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {kind === "bundle" && slots.length < MAX_CARDS && (
              <button
                type="button"
                onClick={() => setSlots((s) => [...s, emptySlot()])}
                className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border-[1.5px] border-dashed border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
              >
                <Plus className="size-5" />
                {t("addCard")}
              </button>
            )}
          </div>
        </section>

        {/* Details */}
        <section className="grid gap-5 sm:grid-cols-2">
          <h2 className="text-xl sm:col-span-2">{marketT("details")}</h2>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">{t("titleLabel")}</span>
            <input
              required
              minLength={2}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === "single" ? t("titlePlaceholderSingle") : kind === "pack" ? t("titlePlaceholderPack") : t("titlePlaceholderBundle")}
              className="kt-mk-input"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">{t("franchise")}</span>
            <select value={franchise} onChange={(e) => setFranchise(e.target.value)} className="kt-mk-input">
              <option value="">{t("franchiseOther")}</option>
              {franchises.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">{t("condition")}</span>
            <select value={condition} onChange={(e) => setCondition(e.target.value as ListingCondition)} className="kt-mk-input">
              {LISTING_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {marketT(`condition.${c}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">{t("price")}</span>
            <input
              required
              inputMode="numeric"
              dir="ltr"
              value={price}
              onChange={(e) => {
                const digits = e.target.value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/[^\d]/g, "");
                setPrice(digits ? Number(digits).toLocaleString("en-US") : "");
              }}
              placeholder="25,000"
              className="kt-mk-input font-mono rtl:text-right"
            />
            <span className="text-xs text-[var(--color-text-muted)]">{t("priceHint")}</span>
          </label>
          {kind === "bundle" ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">{t("cardCount")}</span>
              <input
                type="number"
                min={Math.max(1, filled.length)}
                max={500}
                value={cardCount}
                onChange={(e) => setCardCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                className="kt-mk-input"
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">{t("quantity")}</span>
              <input
                type="number"
                min={1}
                max={999}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
                className="kt-mk-input"
              />
            </label>
          )}
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">{t("description")}</span>
            <textarea
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              className="kt-mk-input resize-y"
            />
          </label>
        </section>

        {error && (
          <p role="alert" className="text-sm text-[var(--color-accent)]">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="justify-center sm:self-start" disabled={publishing || busy.size > 0}>
          {publishing && <Loader2 className="size-4 animate-spin" />}
          {publishing ? t("publishing") : t("publish")}
        </Button>
      </div>

      {/* Live preview */}
      <aside className="order-first lg:order-none">
        <div className="flex flex-col gap-3 lg:sticky lg:top-24">
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">{t("preview")}</span>
          <div className="mx-auto w-full max-w-[260px] lg:max-w-none">
            <ListingCard
              href={null}
              listing={{
                kind,
                title,
                price: priceNum || 0,
                cards: filled.map((s) => ({ front: s.front!, back: s.back })),
                cardCount: effectiveCount,
                sellerCity: profile.city,
                status: "active",
                condition,
                franchise: franchise || null,
              }}
            />
          </div>
          {filled.some((s) => s.back) && (
            <p className="text-center text-xs text-[var(--color-text-muted)]">{marketT("flipHint")}</p>
          )}
        </div>
      </aside>
    </form>
  );
}

function PhotoDrop({
  label,
  required,
  url,
  busy,
  onFile,
  onClear,
  addLabel,
  removeLabel,
  busyLabel,
}: {
  label: string;
  required: boolean;
  url: string | null;
  busy: boolean;
  onFile: (f: File) => void;
  onClear: () => void;
  addLabel: string;
  removeLabel: string;
  busyLabel: string;
}) {
  const [over, setOver] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
        {label}
        {required && <span className="text-[var(--color-accent)]"> *</span>}
      </span>
      <div
        className="kt-mk-drop"
        data-filled={url || undefined}
        data-over={over || undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
      >
        {url ? (
          <>
            <Image src={url} alt={label} fill sizes="140px" className="object-cover" />
            <button
              type="button"
              onClick={onClear}
              aria-label={removeLabel}
              className="absolute end-1.5 top-1.5 z-10 grid size-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-[var(--color-accent)] cursor-pointer"
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        ) : busy ? (
          <span className="flex flex-col items-center gap-1 text-[11px]">
            <Loader2 className="size-5 animate-spin" />
            {busyLabel}
          </span>
        ) : (
          <span className="flex flex-col items-center gap-1 px-1 text-center text-[11px] font-semibold">
            <ImagePlus className="size-5" />
            {addLabel}
          </span>
        )}
        {!url && !busy && (
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            aria-label={`${label} — ${addLabel}`}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        )}
      </div>
    </div>
  );
}
