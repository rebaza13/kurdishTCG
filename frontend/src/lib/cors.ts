/**
 * The admin dashboard (`dashboard/`, a separate Next.js app/origin — port
 * 3001 in dev) calls the frontend's /api/fib/admin/* routes directly, since
 * the FIB and Supabase service-role secrets live only in this app's
 * .env.local. Restricted to that one configured origin, not `*`.
 */
export function corsHeaders(): HeadersInit {
  const origin = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}
