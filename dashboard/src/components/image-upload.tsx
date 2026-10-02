"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { errorMessage, getSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button, Input, Notice } from "@/components/ui";

// Vercel caps function request bodies at 4.5 MB.
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * A loose regex match (e.g. `/^https?:\/\//`) also matches the transient
 * "https://" the input holds mid-keystroke, before a host has been typed —
 * `next/image` throws synchronously on that (invalid URL), crashing the page
 * with no error boundary around it. Only render once it's actually parseable.
 */
function isRenderableImageSrc(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("/")) return true;
  try {
    new URL(src);
    return true;
  } catch {
    return false;
  }
}

/**
 * The storefront's next.config.ts only allows images from its own Supabase
 * storage host (see frontend/next.config.ts `images.remotePatterns`) — any
 * other host makes next/image throw there with no fallback, taking down
 * whatever page renders that image. Uploads always land on the storage host,
 * so this only matters for a hand-pasted URL.
 */
export function isAllowedProductImageHost(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("/")) return true;
  const allowed = [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_R2_PUBLIC_URL]
    .filter((u): u is string => !!u)
    .map((u) => new URL(u).hostname);
  if (!allowed.length) return true; // can't validate without it — don't block save
  try {
    return allowed.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}

const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_EDGE = 1600; // px, longest side — plenty for a product card or gallery
const WEBP_QUALITY = 0.85;

/**
 * Shrink and convert to WebP in the browser before uploading: a multi-MB phone
 * photo becomes a few hundred KB with no visible loss, which keeps R2 storage
 * and storefront bandwidth small and stays under the 4.5 MB request limit.
 * Falls back to the original if the browser can't decode/encode it, or if the
 * result isn't actually smaller. GIF/SVG are left alone (animation / vector).
 */
async function optimizeImage(file: File): Promise<File> {
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY)
    );
    // Safari < 17 can't encode WebP and silently returns a PNG — ignore that.
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${name}.webp`, { type: "image/webp" });
  } catch {
    return file;
  }
}

const UPLOAD_ERRORS: Record<string, string> = {
  forbidden: "The storefront refused this admin session — sign out and back in.",
  bad_type: "Use a JPG, PNG, WebP or AVIF image.",
  too_large: "Image is larger than 4 MB.",
  bad_folder: "Unknown upload folder.",
};

/**
 * Upload one file to Cloudflare R2 and return its public URL. The R2 keys live
 * only in the storefront app, so this is a cross-origin call to its
 * /api/upload, authenticated with this admin's Supabase session.
 */
export async function uploadImage(original: File, folder: string): Promise<string> {
  if (!original.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (original.size > MAX_INPUT_BYTES) throw new Error("Image is larger than 25 MB.");

  const file = await optimizeImage(original);
  if (file.size > MAX_BYTES) throw new Error("Image is still larger than 4 MB after compression.");

  const base = process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000";
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  if (!session) throw new Error("Not signed in.");

  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);

  let res: Response;
  try {
    res = await fetch(`${base}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: form,
    });
  } catch {
    throw new Error(`Couldn't reach the storefront at ${base} to upload the image.`);
  }
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !body.url) {
    throw new Error((body.error && UPLOAD_ERRORS[body.error]) ?? `Upload failed (${res.status}).`);
  }
  return body.url;
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
      {isRenderableImageSrc(src) && (
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
