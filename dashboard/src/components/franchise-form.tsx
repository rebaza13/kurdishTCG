"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { assertWritten, errorMessage, getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { slugify } from "@/lib/format";
import { ImageField, isAllowedProductImageHost } from "@/components/image-upload";
import { LocalizedField, type LangKey } from "@/components/localized-fields";
import {
  Button,
  Card,
  ConfirmButton,
  Field,
  Input,
  Notice,
  PageHeader,
  Spinner,
} from "@/components/ui";

interface FranchiseRow {
  slug: string;
  name_en: string;
  name_ar: string;
  name_ckb: string;
  accent: string;
  badge_en: string;
  badge_ar: string;
  badge_ckb: string;
  description_en: string;
  description_ar: string;
  description_ckb: string;
  image: string;
  sort_order: number;
}

interface FormState {
  slug: string;
  name: Record<LangKey, string>;
  badge: Record<LangKey, string>;
  description: Record<LangKey, string>;
  accent: string;
  image: string;
  sort_order: string;
}

const EMPTY_LANGS: Record<LangKey, string> = { en: "", ar: "", ckb: "" };

const EMPTY: FormState = {
  slug: "",
  name: EMPTY_LANGS,
  badge: EMPTY_LANGS,
  description: EMPTY_LANGS,
  accent: "#ec3013",
  image: "",
  sort_order: "0",
};

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function toForm(row: FranchiseRow): FormState {
  return {
    slug: row.slug,
    name: { en: row.name_en, ar: row.name_ar, ckb: row.name_ckb },
    badge: { en: row.badge_en, ar: row.badge_ar, ckb: row.badge_ckb },
    description: { en: row.description_en, ar: row.description_ar, ckb: row.description_ckb },
    accent: row.accent,
    image: row.image,
    sort_order: String(row.sort_order),
  };
}

function toRow(f: FormState): FranchiseRow | string {
  const sort = Number(f.sort_order);
  if (!SLUG_RE.test(f.slug)) return "Slug must be lowercase letters, numbers and dashes.";
  for (const [label, v] of [["name", f.name], ["badge", f.badge], ["description", f.description]] as const) {
    if (!v.en.trim() || !v.ar.trim() || !v.ckb.trim())
      return `Fill the ${label} in English, Arabic and Kurdish.`;
  }
  if (!f.accent.trim()) return "Accent colour is required.";
  if (!f.image.trim()) return "Add an image.";
  if (!isAllowedProductImageHost(f.image.trim()))
    return "Image must be uploaded (or a link to it) — pasted links from other sites aren't shown on the storefront and would break this franchise's page.";
  if (!Number.isInteger(sort)) return "Sort order must be a whole number.";
  return {
    slug: f.slug,
    name_en: f.name.en.trim(),
    name_ar: f.name.ar.trim(),
    name_ckb: f.name.ckb.trim(),
    accent: f.accent.trim(),
    badge_en: f.badge.en.trim(),
    badge_ar: f.badge.ar.trim(),
    badge_ckb: f.badge.ckb.trim(),
    description_en: f.description.en.trim(),
    description_ar: f.description.ar.trim(),
    description_ckb: f.description.ckb.trim(),
    image: f.image.trim(),
    sort_order: sort,
  };
}

export function FranchiseForm({ slug }: { slug?: string }) {
  const editing = slug !== undefined;

  const { data, error } = useQuery(async () => {
    const supabase = getSupabase();
    if (!editing) return { row: null, productCount: 0 };
    const [row, products] = await Promise.all([
      supabase.from("franchises").select("*").eq("slug", slug).maybeSingle(),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("franchise_slug", slug),
    ]);
    if (row.error) throw row.error;
    if (products.error) throw products.error;
    return { row: row.data as FranchiseRow | null, productCount: products.count ?? 0 };
  }, [slug]);

  const back = (
    <Link href="/franchises" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
      <ArrowLeft className="size-4" /> Franchises
    </Link>
  );

  if (!data) {
    return (
      <>
        {back}
        {error ? <Notice>{error}</Notice> : <Spinner />}
      </>
    );
  }
  if (editing && !data.row) {
    return (
      <>
        {back}
        <Notice>Franchise not found.</Notice>
      </>
    );
  }

  return (
    <>
      {back}
      <FormBody
        key={slug ?? "new"}
        initial={data.row ? toForm(data.row) : EMPTY}
        editing={editing}
        productCount={data.productCount}
      />
    </>
  );
}

function FormBody({
  initial,
  editing,
  productCount,
}: {
  initial: FormState;
  editing: boolean;
  productCount: number;
}) {
  const router = useRouter();
  const [f, setF] = useState<FormState>(initial);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function patch(next: Partial<FormState>) {
    setSaved(false);
    setF((prev) => {
      const merged = { ...prev, ...next };
      if (!editing && !slugTouched && next.name) merged.slug = slugify(merged.name.en);
      return merged;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const row = toRow(f);
    if (typeof row === "string") {
      setError(row);
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabase();
      if (editing) {
        const { slug, ...changes } = row;
        const { data, error } = await supabase
          .from("franchises")
          .update(changes)
          .eq("slug", slug)
          .select("slug");
        if (error) throw error;
        assertWritten(data, "The franchise");
        setSaved(true);
      } else {
        const { error } = await supabase.from("franchises").insert(row);
        if (error) throw error;
        router.push("/franchises");
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
        .from("franchises")
        .delete()
        .eq("slug", f.slug)
        .select("slug");
      if (error) throw error;
      assertWritten(data, "The deletion");
      router.push("/franchises");
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <PageHeader
        title={editing ? f.name.en || "Edit franchise" : "New franchise"}
        subtitle={
          editing
            ? `${productCount} product${productCount === 1 ? "" : "s"}`
            : "A new franchise appears on the storefront as soon as it's saved."
        }
        actions={
          <>
            {editing && (
              <ConfirmButton
                loading={deleting}
                disabled={saving || productCount > 0}
                title={productCount > 0 ? "Remove or move its products first" : undefined}
                onConfirm={handleDelete}
                confirmLabel="Click again to delete"
              >
                Delete
              </ConfirmButton>
            )}
            <Button type="submit" variant="primary" loading={saving} disabled={deleting}>
              {editing ? "Save changes" : "Create franchise"}
            </Button>
          </>
        }
      />

      {error && <Notice>{error}</Notice>}
      {saved && <Notice tone="success">Saved.</Notice>}

      <Card className="flex flex-col gap-4 p-4">
        <LocalizedField
          label="Name"
          required
          values={f.name}
          onChange={(lang, v) => patch({ name: { ...f.name, [lang]: v } })}
        />
        <LocalizedField
          label="Badge"
          required
          values={f.badge}
          onChange={(lang, v) => patch({ badge: { ...f.badge, [lang]: v } })}
        />
        <LocalizedField
          label="Description"
          multiline
          required
          values={f.description}
          onChange={(lang, v) => patch({ description: { ...f.description, [lang]: v } })}
        />
      </Card>

      <Card className="grid gap-4 p-4 sm:grid-cols-3">
        <Field label="Slug" required hint={editing ? "Can't be changed" : "Used in the URL"}>
          <Input
            value={f.slug}
            readOnly={editing}
            onChange={(e) => {
              setSlugTouched(true);
              patch({ slug: e.target.value });
            }}
            required
          />
        </Field>
        <Field label="Accent colour" required hint="Hex, e.g. #ec3013 — or a CSS colour / var()">
          <div className="flex gap-2">
            <input
              type="color"
              aria-label="Pick accent colour"
              value={HEX_RE.test(f.accent) ? f.accent : "#888888"}
              onChange={(e) => patch({ accent: e.target.value })}
              className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-surface p-1"
            />
            <Input value={f.accent} onChange={(e) => patch({ accent: e.target.value })} required />
          </div>
        </Field>
        <Field label="Sort order" hint="Lower comes first">
          <Input
            type="number"
            step={1}
            value={f.sort_order}
            onChange={(e) => patch({ sort_order: e.target.value })}
          />
        </Field>
      </Card>

      <Card className="p-4">
        <Field label="Image" required>
          <ImageField
            value={f.image}
            onChange={(image) => patch({ image })}
            folder={`franchises/${f.slug || "new"}`}
          />
        </Field>
      </Card>
    </form>
  );
}
