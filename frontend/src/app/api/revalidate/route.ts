import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { verifyAdmin } from "@/lib/supabase/verify-admin";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * Called by the admin dashboard right after it saves/deletes a product or
 * franchise, so the storefront shows the change on the next visit instead of
 * waiting out the cache (60 s product data, 5 min page ISR).
 */
export async function POST(request: Request) {
  const headers = corsHeaders();
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
    }
    // expire: 0 → next request refetches instead of serving the stale copy.
    revalidateTag("products", { expire: 0 });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true }, { headers });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers });
  }
}
