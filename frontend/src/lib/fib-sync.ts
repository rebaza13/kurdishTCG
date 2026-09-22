import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getFibPaymentStatus, type FibPaymentStatusValue } from "@/lib/fib";

const STATUS_MAP: Record<FibPaymentStatusValue, string> = {
  UNPAID: "pending",
  PAID: "paid",
  DECLINED: "declined",
  REFUND_REQUESTED: "refund_requested",
  REFUNDED: "refunded",
};

/**
 * The single place that turns a FIB payment status into a DB write.
 * Called from both the webhook and the client-polling endpoint — never
 * trusts a caller-supplied status, always re-fetches it from FIB with our
 * own OAuth2 credentials first, so a forged webhook POST can't mark an
 * order paid.
 */
export async function syncFibPaymentStatus(paymentId: string) {
  const admin = getSupabaseAdmin();

  const { data: order, error: findError } = await admin
    .from("orders")
    .select("id, status, payment_status")
    .eq("fib_payment_id", paymentId)
    .maybeSingle();
  if (findError) throw findError;
  if (!order) return null;

  const fibStatus = await getFibPaymentStatus(paymentId);
  const paymentStatus = STATUS_MAP[fibStatus.status];

  const update: Record<string, unknown> = { payment_status: paymentStatus };
  if (fibStatus.paidAt) update.fib_paid_at = fibStatus.paidAt;
  if (fibStatus.decliningReason) update.fib_declining_reason = fibStatus.decliningReason;
  if (fibStatus.declinedAt) update.fib_declined_at = fibStatus.declinedAt;
  if (fibStatus.paidBy) {
    update.fib_paid_by_name = fibStatus.paidBy.name;
    update.fib_paid_by_iban = fibStatus.paidBy.iban;
  }

  // Payment settling also drives fulfillment status, but only forward from
  // "requested" — never clobber progress an admin already made by hand.
  if (order.status === "requested") {
    if (paymentStatus === "paid") update.status = "confirmed";
    else if (paymentStatus === "declined") update.status = "cancelled";
  }

  const { data: updated, error: updateError } = await admin
    .from("orders")
    .update(update)
    .eq("id", order.id)
    .select("id, status, payment_status")
    .single();
  if (updateError) throw updateError;

  return { order: updated, fibStatus };
}
