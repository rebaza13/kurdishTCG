import "server-only";
import type { User } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/supabase/verify-user";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Verifies the bearer token AND that the user's profile role is 'admin'. */
export async function verifyAdmin(request: Request): Promise<User | null> {
  const user = await verifyUser(request);
  if (!user) return null;

  const admin = getSupabaseAdmin();
  const { data } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin" ? user : null;
}
