"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ProductType, Rarity } from "@tcg/types";
import { assertWritten, errorMessage, getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { PRODUCT_TYPES, PRODUCT_TYPE_LABEL, RARITIES, slugify } from "@/lib/format";
import { GalleryField, ImageField, isAllowedProductImageHost } from "@/components/image-upload";
import { LocalizedField, type LangKey } from "@/components/localized-fields";
import {
  Button,
  Card,
  ConfirmButton,
  Field,
  Input,
  Notice,
  PageHeader,
  Select,
  Spinner,
} from "@/components/ui";

interface FormState {
  id: string;
  slug: string;
  franchise_slug: string;
  product_type: ProductType;
  name: Record<LangKey, string>;
  description: Record<LangKey, string>;
  set_name: string;
  card_number: string;
  rarity: Rarity | "";
  price: string;
  condition: string;
  grade: string;
  image: string;
  images: string[];
  stock: string;
}

const EMPTY_LANGS: Record<LangKey, string> = { en: "", ar: "", ckb: "" };

const EMPTY: FormState = {
  id: "",
  slug: "",
  franchise_slug: "",
  product_type: "single_card",
  name: EMPTY_LANGS,
  description: EMPTY_LANGS,
  set_name: "",
  card_number: "",
  rarity: "",
  price: "",
  condition: "New",
  grade: "",
  image: "",
  images: [],
  stock: "0",
};

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface ProductRow {
  id: string;
  slug: string;
  franchise_slug: string;
  product_type: ProductType;
  name_en: string;
  name_ar: string;
  name_ckb: string;
  description_en: string;
  description_ar: string;
  description_ckb: string;
  set_name: string;
  card_number: string | null;
  rarity: Rarity | null;
  price: number | string;
  condition: string;
  grade: string | null;
  image: string;
  images: string[] | null;
  stock: number;
}

function toForm(row: ProductRow): FormState {
  return {
    id: row.id,
    slug: row.slug,
    franchise_slug: row.franchise_slug,
    product_type: row.product_type,
    name: { en: row.name_en, ar: row.name_ar, ckb: row.name_ckb },
    description: { en: row.description_en, ar: row.description_ar, ckb: row.description_ckb },
    set_name: row.set_name,
    card_number: row.card_number ?? "",
    rarity: row.rarity ?? "",
    price: String(row.price),
    condition: row.condition,
    grade: row.grade ?? "",
    image: row.image,
    images: row.images ?? [],
    stock: String(row.stock),
  };
}

/** Validate and convert the form into a `products` row, or return an error. */
function toPayload(f: FormState): { row: Omit<ProductRow, "price" | "stock"> & { price: number; stock: number } } | { error: string } {
  const price = Number(f.price);
  const stock = Number(f.stock);
  if (!f.franchise_slug) return { error: "Choose a franchise." };
  if (!f.name.en.trim() || !f.name.ar.trim() || !f.name.ckb.trim())
    return { error: "Enter the product name in English, Arabic and Kurdish." };
  if (!SLUG_RE.test(f.slug)) return { error: "Slug must be lowercase letters, numbers and dashes." };
  if (!f.id.trim()) return { error: "Product id is required." };
  if (!f.set_name.trim()) return { error: "Set name is required." };
  if (f.price === "" || !Number.isInteger(price) || price < 0)
    return { error: "Enter the price in whole dinars (IQD), e.g. 25000." };
  if (!Number.isInteger(stock) || stock < 0) return { error: "Stock must be a whole number ≥ 0." };
  if (!f.image.trim()) return { error: "Add a main image." };
  if (!isAllowedProductImageHost(f.image.trim()))
    return { error: "Main image must be uploaded (or a link to it) — pasted links from other sites aren't shown on the storefront and would break this product's page." };
  if (f.images.some((img) => !isAllowedProductImageHost(img)))
    return { error: "One of the extra images isn't uploaded here — pasted links from other sites aren't shown on the storefront." };

  return {
    row: {
      id: f.id.trim(),
      slug: f.slug,
      franchise_slug: f.franchise_slug,
      product_type: f.product_type,
      name_en: f.name.en.trim(),
      name_ar: f.name.ar.trim(),
      name_ckb: f.name.ckb.trim(),
      description_en: f.description.en.trim(),
      description_ar: f.description.ar.trim(),
      description_ckb: f.description.ckb.trim(),
      set_name: f.set_name.trim(),
      card_number: f.card_number.trim() || null,
      // Rarity only means something for single cards.
      rarity: f.product_type === "single_card" ? f.rarity || null : null,
      price,
      condition: f.condition.trim() || "New",
      grade: f.grade.trim() || null,
      image: f.image.trim(),
      images: f.images,
      stock,
    },
  };
}

export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const editing = productId !== undefined;

  const { data, error: loadError } = useQuery(async () => {
    const supabase = getSupabase();
    const [franchises, product] = await Promise.all([
      supabase.from("franchises").select("slug,name_en").order("sort_order"),
      editing
        ? supabase.from("products").select("*").eq("id", productId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (franchises.error) throw franchises.error;
    if (product.error) throw product.error;
    return {
      franchises: (franchises.data ?? []) as { slug: string; name_en: string }[],
      product: product.data as ProductRow | null,
    };
  }, [productId]);

  const back = (
    <Link
      href="/products"
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
    >
      <ArrowLeft className="size-4" /> Products
    </Link>
  );

  if (!data) {
    return (
      <>
        {back}
        {loadError ? <Notice>{loadError}</Notice> : <Spinner />}
      </>
    );
  }
  if (editing && !data.product) {
    return (
      <>
        {back}
        <Notice>Product not found.</Notice>
      </>
    );
  }

  return (
    <>
      {back}
      <FormBody
        // Remount if a different product is loaded.
        key={productId ?? "new"}
        franchises={data.franchises}
        initial={data.product ? toForm(data.product) : EMPTY}
        editing={editing}
        onDone={() => router.push("/products")}
      />
    </>
  );
}

function FormBody({
  franchises,
  initial,
  editing,
  onDone,
}: {
  franchises: { slug: string; name_en: string }[];
  initial: FormState;
  editing: boolean;
  onDone: () => void;
}) {
  const [f, setF] = useState<FormState>(initial);
  // While creating, slug and id follow the name/franchise until edited by hand.
  const [slugTouched, setSlugTouched] = useState(false);
  const [idTouched, setIdTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function patch(next: Partial<FormState>) {
    setSaved(false);
    setF((prev) => {
      const merged = { ...prev, ...next };
      if (!editing) {
        if (!slugTouched && next.name) merged.slug = slugify(merged.name.en);
        if (!idTouched)
          merged.id = [merged.franchise_slug, merged.slug].filter(Boolean).join("-");
      }
      return merged;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const result = toPayload(f);
    if ("error" in result) {
      setError(result.error);
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabase();
      if (editing) {
        const { id, ...changes } = result.row;
        const { data, error } = await supabase
          .from("products")
          .update(changes)
          .eq("id", id)
          .select("id");
        if (error) throw error;
        assertWritten(data, "The product");
        setSaved(true);
      } else {
        const { error } = await supabase.from("products").insert(result.row);
        if (error) throw error;
        onDone();
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      const { data, error } = await getSupabase()
        .from("products")
        .delete()
        .eq("id", f.id)
        .select("id");
      if (error) throw error;
      assertWritten(data, "The deletion");
      onDone();
    } catch (err) {
      const message = errorMessage(err);
      setError(
        message.includes("still referenced")
          ? "This product appears in past orders, so it can't be deleted. Set its stock to 0 instead."
          : message
      );
      setDeleting(false);
    }
  }

  const folder = `products/${f.id || "new"}`;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <PageHeader
        title={editing ? f.name.en || "Edit product" : "New product"}
        subtitle={editing ? `id: ${f.id}` : "Every product needs English, Arabic and Kurdish text."}
        actions={
          <>
            {editing && (
              <ConfirmButton
                loading={deleting}
                disabled={saving}
                onConfirm={handleDelete}
                confirmLabel="Click again to delete"
              >
                Delete
              </ConfirmButton>
            )}
            <Button type="submit" variant="primary" loading={saving} disabled={deleting}>
              {editing ? "Save changes" : "Create product"}
            </Button>
          </>
        }
      />

      {error && <Notice>{error}</Notice>}
      {saved && <Notice tone="success">Saved.</Notice>}

      <Card className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Franchise" required>
          <Select
            value={f.franchise_slug}
            onChange={(e) => patch({ franchise_slug: e.target.value })}
            required
          >
            <option value="">Select…</option>
            {franchises.map((fr) => (
              <option key={fr.slug} value={fr.slug}>
                {fr.name_en}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type" required>
          <Select
            value={f.product_type}
            onChange={(e) => patch({ product_type: e.target.value as ProductType })}
          >
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>
                {PRODUCT_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Set" required hint="e.g. Origins, Ink Rising">
          <Input value={f.set_name} onChange={(e) => patch({ set_name: e.target.value })} required />
        </Field>
        <Field label="Card number">
          <Input value={f.card_number} onChange={(e) => patch({ card_number: e.target.value })} />
        </Field>
        {f.product_type === "single_card" && (
          <Field label="Rarity">
            <Select value={f.rarity} onChange={(e) => patch({ rarity: e.target.value as Rarity | "" })}>
              <option value="">—</option>
              {RARITIES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Condition">
          <Input value={f.condition} onChange={(e) => patch({ condition: e.target.value })} />
        </Field>
        <Field label="Grade" hint="Optional, e.g. PSA 10">
          <Input value={f.grade} onChange={(e) => patch({ grade: e.target.value })} />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4 p-4">
        <LocalizedField
          label="Name"
          required
          values={f.name}
          onChange={(lang, value) => patch({ name: { ...f.name, [lang]: value } })}
        />
        <LocalizedField
          label="Description"
          multiline
          values={f.description}
          onChange={(lang, value) => patch({ description: { ...f.description, [lang]: value } })}
        />
      </Card>

      <Card className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Price (IQD)" required hint="Whole dinars, e.g. 25000">
          <Input
            type="number"
            min={0}
            step={1}
            value={f.price}
            onChange={(e) => patch({ price: e.target.value })}
            required
          />
        </Field>
        <Field label="Stock" required>
          <Input
            type="number"
            min={0}
            step={1}
            value={f.stock}
            onChange={(e) => patch({ stock: e.target.value })}
            required
          />
        </Field>
        <Field label="Slug" required hint="Used in the product URL">
          <Input
            value={f.slug}
            onChange={(e) => {
              setSlugTouched(true);
              patch({ slug: e.target.value });
            }}
            required
          />
        </Field>
        <Field label="Product id" required hint={editing ? "Can't be changed" : "Unique, permanent"}>
          <Input
            value={f.id}
            readOnly={editing}
            onChange={(e) => {
              setIdTouched(true);
              patch({ id: e.target.value });
            }}
            required
          />
        </Field>
      </Card>

      <Card className="flex flex-col gap-5 p-4">
        <Field label="Main image" required>
          <ImageField value={f.image} onChange={(image) => patch({ image })} folder={folder} />
        </Field>
        <Field label="More images">
          <GalleryField value={f.images} onChange={(images) => patch({ images })} folder={folder} />
        </Field>
      </Card>
    </form>
  );
}
