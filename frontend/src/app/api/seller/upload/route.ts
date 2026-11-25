import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/supabase/verify-user";
import { putPublicImage } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";
import { LISTING_PREFIX } from "@/lib/listings";

export const dynamic = "force-dynamic";

// Vercel caps function request bodies at 4.5 MB; the Sell page shrinks photos first.
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** A signed-in seller uploads one listing photo into their own R2 folder. */
export async function POST(request: Request) {
  const limited = rateLimit(request, "seller-upload", 30, 60_000);
  if (limited) return limited;
  try {
    const user = await verifyUser(request);
    if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "missing_file" }, { status: 400 });
    const ext = TYPES[file.type];
    if (!ext) return NextResponse.json({ error: "bad_type" }, { status: 415 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });

    const key = `${LISTING_PREFIX}${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const url = await putPublicImage(key, Buffer.from(await file.arrayBuffer()), file.type);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[seller/upload]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
