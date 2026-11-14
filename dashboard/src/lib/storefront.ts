import { getSupabase } from "@/lib/supabase";

/**
 * Tell the storefront to drop its cached catalog (product data + ISR pages)
 * so an admin edit shows up on the next page load instead of after the cache
 * expires. Best-effort: a failure here never fails the save itself — the
 * storefront still catches up on its own within 5 minutes.
 */
export async function refreshStorefront(): Promise<void> {
  try {
    const base = process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000";
    const {
      data: { session },
    } = await getSupabase().auth.getSession();
    if (!session) return;
    await fetch(`${base}/api/revalidate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  } catch {
    // ignore — see above
  }
}
