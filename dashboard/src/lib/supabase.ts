import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client for the admin dashboard.
 *
 * Only the public URL + publishable key ever live in this app. What an admin
 * may read or change is enforced in Postgres by Row Level Security
 * (`public.is_admin()`), not by this UI — the login gate is a convenience.
 */
let client: SupabaseClient | undefined;

/**
 * Names of the required public env vars that are missing. NEXT_PUBLIC_*
 * values are baked in at build time, so on Vercel they must be set on the
 * project BEFORE the deploy that should use them (then redeploy).
 */
export function missingSupabaseEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return missing;
}

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured — copy .env.example to .env.local and fill in " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  client = createClient(url, key);
  return client;
}

export const PRODUCT_IMAGES_BUCKET = "product-images";

/** Human-readable message from a Supabase/Postgres/unknown error. */
export function errorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { message?: string; code?: string };
    // 23503 = foreign_key_violation, 23505 = unique_violation
    if (e.code === "23503") {
      return "This row is still referenced by other data (for example products or past orders), so it can't be deleted.";
    }
    if (e.code === "23505") return "A record with that identifier already exists.";
    // 42883 = undefined_function: the database is missing a migration.
    if (e.code === "42883") {
      return (
        "The database is missing a function this action needs — apply the newest file in " +
        `supabase/migrations/ in the Supabase SQL editor, then retry. (${e.message ?? ""})`
      );
    }
    // Raised by the stock triggers, e.g. when reopening a cancelled order
    // whose items have sold out since.
    const short = /out_of_stock:(\S+)/.exec(e.message ?? "");
    if (short) {
      return `Not enough stock — product "${short[1]}" doesn't have enough left for this order. Restock it first.`;
    }
    if (e.message) return e.message;
  }
  return "Something went wrong.";
}

/**
 * Row Level Security makes a forbidden UPDATE/DELETE succeed with zero rows
 * instead of raising an error. Call this on the `.select()` result so a
 * silently-blocked write is reported instead of looking like a success.
 */
export function assertWritten<T>(rows: T[] | null, what: string): T[] {
  if (!rows || rows.length === 0) {
    throw new Error(
      `${what} was not saved — the database rejected it (row not found, or your account lacks permission). ` +
        "If this is Settings, apply supabase/migrations/0001_admin_dashboard.sql."
    );
  }
  return rows;
}
