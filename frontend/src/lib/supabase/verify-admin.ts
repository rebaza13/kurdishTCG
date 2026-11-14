import "server-only";
import { createClient, type User } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/supabase/verify-user";

/**
 * Verifies the bearer token AND that the user's profile role is 'admin'.
 *
 * The role is read with the caller's own token (RLS: "users read their own
 * profile"), so this doesn't depend on SUPABASE_SERVICE_ROLE_KEY — a missing
 * service key used to make every admin route (e.g. /api/upload) throw a 500.
 */
export async function verifyAdmin(request: Request): Promise<User | null> {
  const user = await verifyUser(request);
  if (!user) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const token = request.headers.get("authorization")!.slice(7).trim();
  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin" ? user : null;
}
