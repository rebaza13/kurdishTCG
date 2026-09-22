import { getSupabase } from "@/lib/supabase";

/**
 * The FIB and Supabase service-role secrets live only in the storefront
 * app's .env.local (`frontend/src/app/api/fib/admin/*`), so admin actions
 * that touch FIB are a cross-origin call to it, authenticated with this
 * admin's own Supabase session (verified server-side there via `is_admin`).
 */
async function callAdminApi(path: string, orderId: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000";
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  if (!session) throw new Error("Not signed in.");

  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ orderId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed (${res.status}).`);
  }
}

export function refundFibPayment(orderId: string): Promise<void> {
  return callAdminApi("/api/fib/admin/refund", orderId);
}

export function cancelFibPayment(orderId: string): Promise<void> {
  return callAdminApi("/api/fib/admin/cancel", orderId);
}
