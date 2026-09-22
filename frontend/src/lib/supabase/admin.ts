import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses Row Level Security entirely.
 * Server-only (route handlers), never imported from client components.
 * Used for the writes that must be trusted (order pricing, payment status)
 * rather than left to whatever a browser sends.
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — get it from the Supabase " +
        "dashboard (Project Settings → API → service_role key) and add it " +
        "to frontend/.env.local. Never expose it to the browser."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
