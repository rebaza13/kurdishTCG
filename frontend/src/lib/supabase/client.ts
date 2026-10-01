import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Browser Supabase client (auth session in localStorage). A single shared
 * instance: every call used to build a fresh client, which spun up one
 * GoTrueClient per call against the same storage key — Supabase warns about
 * that ("Multiple GoTrueClient instances detected") and the instances race
 * each other on token refresh, so a sign-in/sign-out in one component could
 * be missed by another's onAuthStateChange listener.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * (or the legacy NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local.
 */
export function getSupabaseClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local."
    );
  }

  browserClient = createClient(url, anonKey);
  return browserClient;
}
