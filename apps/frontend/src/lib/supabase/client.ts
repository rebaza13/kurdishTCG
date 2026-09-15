import { createClient } from "@supabase/supabase-js";

/**
 * Not wired into any page yet — the mock data layer (`lib/data`) is still
 * the only thing components read from. This client exists so the swap to
 * real Supabase queries (build order step 5 in ../../../.claude/TODO.md)
 * is a same-interface change, not a new integration.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in
 * .env.local (see .env.example). Until the user authenticates the Supabase
 * MCP server (`claude /mcp`) and those are set, calling this throws.
 */
export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured yet — set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local once the project is connected."
    );
  }

  return createClient(url, anonKey);
}
