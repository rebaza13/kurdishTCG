import { NextResponse } from "next/server";
import { syncFibPaymentStatus } from "@/lib/fib-sync";

export const dynamic = "force-dynamic";

/**
 * FIB calls this when a payment's status changes (set as `statusCallbackUrl`
 * at payment creation — see /api/checkout). Only reachable from a public
 * HTTPS deployment, not from `next dev` on localhost; the account order page
 * polls /api/fib/status as a fallback per FIB's own best-practice doc.
 *
 * The request body is untrusted — we don't take its `status` field on
 * faith, only the `paymentId`, then ask FIB directly what the real status
 * is. That's what actually gets written to the DB.
 */
export async function POST(request: Request) {
  let body: { paymentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const paymentId = body.paymentId;
  if (!paymentId || typeof paymentId !== "string") {
    return NextResponse.json({ error: "missing_payment_id" }, { status: 400 });
  }

  try {
    const result = await syncFibPaymentStatus(paymentId);
    if (!result) {
      // Unknown paymentId — acknowledge so FIB doesn't retry forever.
      return NextResponse.json({ ok: true, known: false });
    }
    return NextResponse.json({ ok: true, known: true });
  } catch {
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
