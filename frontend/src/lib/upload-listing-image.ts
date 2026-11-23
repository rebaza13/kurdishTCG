"use client";

import { getSupabaseClient } from "@/lib/supabase/client";

const MAX_EDGE = 1400;
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Downscale a phone photo (often 4000px+, several MB) to ≤1400px WebP in
 * the browser, then upload it to `listing-images/<uid>/…`. The storage
 * policy only allows a user's own folder, and the listings trigger only
 * accepts photos from it. Returns the public URL.
 */
export async function uploadListingImage(file: File, userId: string): Promise<string> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name)) {
    throw new Error("unsupported_type");
  }
  const blob = await shrink(file).catch(() => file);
  if (blob.size > MAX_BYTES) throw new Error("too_large");

  const type = blob.type || "image/jpeg";
  const ext = type === "image/webp" ? "webp" : type === "image/png" ? "png" : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage
    .from("listing-images")
    .upload(path, blob, { contentType: type, cacheControl: "31536000", upsert: false });
  if (error) throw error;
  return supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl;
}

async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no_canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!out) throw new Error("encode_failed");
  // Safari without WebP encoding hands back PNG — fine, just bigger.
  return out;
}
