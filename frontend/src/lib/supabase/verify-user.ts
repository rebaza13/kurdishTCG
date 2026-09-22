import "server-only";
import { createClient, type User } from "@supabase/supabase-js";

/**
 * The storefront's Supabase client keeps its session in the browser
 * (localStorage), not in a cookie the server can read — so route handlers
 * accept the access token in an `Authorization: Bearer <token>` header and
 * verify it against Supabase Auth here. Returns null for guests/invalid
 * tokens; callers decide whether that's allowed (cash checkout) or not
 * (FIB checkout, which requires a signed-in customer).
 */
export async function verifyUser(request: Request): Promise<User | null> {
  const auth = request.headers.get("authorization");
  const token = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data.user;
}
