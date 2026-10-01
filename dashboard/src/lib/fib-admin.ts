import { getSupabase } from "@/lib/supabase";

/**
 * The FIB and Supabase service-role secrets live only in the storefront
 * app's .env.local (`frontend/src/app/api/fib/admin/*`), so admin actions
 * that touch FIB are a cross-origin call to it, authenticated with this
 * admin's own Supabase session (verified server-side there via `is_admin`).
 */
/** The storefront answers with `{ error: code, message? }` — make codes readable. */
const ERROR_TEXT: Record<string, string> = {
  forbidden: "The storefront refused this admin session — sign out and back in.",
  not_found: "No FIB payment was found for this order.",
  not_refundable: "Only a paid FIB payment can be refunded — reload to see its current status.",
  not_cancellable: "Only an unpaid (pending) FIB payment can be cancelled — reload to see its current status.",
  fib_error: "FIB rejected the request. Refunds are only possible within 24 hours of payment.",
  server_error: "The storefront couldn't load this order. Try again.",
};

async function callAdminApi(path: string, orderId: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000";
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  if (!session) throw new Error("Not signed in.");

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ orderId }),
    });
  } catch {
    // Network failure or a CORS rejection (storefront down, or its
    // NEXT_PUBLIC_DASHBOARD_URL doesn't match this dashboard's origin).
    throw new Error(
      `Couldn't reach the storefront at ${base} — it may be down, or it failed without answering. Reload the order to see whether the payment status changed.`
    );
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(
      body.message ?? (body.error && ERROR_TEXT[body.error]) ?? `Request failed (${res.status}).`
    );
  }
}

export function refundFibPayment(orderId: string): Promise<void> {
  return callAdminApi("/api/fib/admin/refund", orderId);
}

export function cancelFibPayment(orderId: string): Promise<void> {
  return callAdminApi("/api/fib/admin/cancel", orderId);
}
