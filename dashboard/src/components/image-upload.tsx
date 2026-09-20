"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { PRODUCT_IMAGES_BUCKET, errorMessage, getSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button, Input, Notice } from "@/components/ui";

const MAX_BYTES = 8 * 1024 * 1024;

/** Upload one file to the public product-images bucket and return its URL. */
export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_BYTES) throw new Error("Image is larger than 8 MB.");

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;

  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw error;

  return supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Small remote-image preview; `unoptimized` because admins paste arbitrary URLs. */
export function Thumb({
  src,
  className,
  alt = "",
}: {
  src: string;
  className?: string;
  alt?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-md border border-line bg-surface-2",
        className ?? "size-10"
      )}
    >
      {src && /^https?:\/\/|^\//.test(src) && (
        <Image src={src} alt={alt} fill unoptimized sizes="160px" className="object-cover" />
      )}
    </div>
  );
}

function useUpload(folder: string, onUploaded: (url: string) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        onUploaded(await uploadImage(file, folder));
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return { inputRef, busy, error, onFiles };
}

/** One image: preview + upload button + editable URL. */
export function ImageField({
  value,
  onChange,
  folder,
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
}) {
  const { inputRef, busy, error, onFiles } = useUpload(folder, onChange);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <Thumb src={value} className="size-24" alt="Preview" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://… (or upload)"
            aria-label="Image URL"
          />
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
            <Button
              size="sm"
              loading={busy}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="size-3.5" /> Upload image
            </Button>
          </div>
        </div>
      </div>
      {error && <Notice>{error}</Notice>}
    </div>
  );
}

/** Extra gallery images: thumbnails with remove + multi-upload. */
export function GalleryField({
  value,
  onChange,
  folder,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  folder: string;
}) {
  const { inputRef, busy, error, onFiles } = useUpload(folder, (url) =>
    onChange([...value, url])
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <div key={`${url}-${i}`} className="relative">
            <Thumb src={url} className="size-20" alt={`Gallery image ${i + 1}`} />
            <button
              type="button"
              aria-label={`Remove gallery image ${i + 1}`}
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border border-line bg-surface text-danger shadow-sm hover:bg-surface-2"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line text-xs text-muted hover:bg-surface-2 disabled:opacity-50"
        >
          <ImagePlus className="size-4" />
          {busy ? "Uploading…" : "Add"}
        </button>
      </div>
      {error && <Notice>{error}</Notice>}
    </div>
  );
}
