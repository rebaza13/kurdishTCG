import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/supabase/verify-admin";
import { corsHeaders } from "@/lib/cors";
import { R2_FOLDERS, putPublicImage } from "@/lib/r2";

export const dynamic = "force-dynamic";

// Vercel caps function request bodies at 4.5 MB.
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * Admin-only image upload to Cloudflare R2, called cross-origin by the
 * dashboard with the admin's Supabase session. The R2 keys never leave this app.
 */
async function handle(request: Request) {
  const headers = corsHeaders();
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const folder = String(form?.get("folder") ?? "");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400, headers });
  }
  // Dashboard passes `<folder>/<slug>`; only the first segment picks the R2 prefix.
  const top = folder.split("/")[0];
  if (!(R2_FOLDERS as readonly string[]).includes(top)) {
    return NextResponse.json({ error: "bad_folder" }, { status: 400, headers });
  }
  const ext = TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "bad_type" }, { status: 415, headers });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413, headers });
  }

  const sub = folder
    .split("/")
    .slice(1)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 60);
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const key = `${top}/${sub ? `${sub}/` : ""}${name}`;

  const url = await putPublicImage(key, Buffer.from(await file.arrayBuffer()), file.type);
  return NextResponse.json({ url }, { headers });
}

export async function POST(request: Request) {
  try {
    return await handle(request);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: corsHeaders() });
  }
}
