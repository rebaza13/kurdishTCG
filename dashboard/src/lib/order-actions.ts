import type { OrderStatus, PaymentStatus } from "@tcg/types";
import { assertWritten, getSupabase } from "@/lib/supabase";
import { ORDERS_CHANGED_EVENT } from "@/lib/use-query";
import { cancelFibPayment } from "@/lib/fib-admin";

/** The delivery pipeline, in order. `cancelled` (rejected) sits outside it. */
export const PIPELINE: OrderStatus[] = ["requested", "confirmed", "shipped", "delivered"];

/** The one obvious next step for an order, with the button label for it. */
export const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  requested: { to: "confirmed", label: "Accept order" },
  confirmed: { to: "shipped", label: "Send out for delivery" },
  shipped: { to: "delivered", label: "Mark delivered" },
};

/** Orders that can still be rejected (anything not finished). */
export function canReject(status: OrderStatus): boolean {
  return status === "requested" || status === "confirmed" || status === "shipped";
}

/** One step back along the pipeline — to undo a mis-click. */
export function previousStep(status: OrderStatus): OrderStatus | null {
  const i = PIPELINE.indexOf(status);
  return i > 0 ? PIPELINE[i - 1] : null;
}

/**
 * Change an order's status. Stock is handled by the database triggers
 * (rejecting gives stock back, reopening takes it again).
 */
export async function setOrderStatus(
  order: { id: string; payment_method: string; payment_status: PaymentStatus | null },
  next: OrderStatus
): Promise<void> {
  const { data, error } = await getSupabase()
    .from("orders")
    .update({ status: next })
    .eq("id", order.id)
    .select("id");
  if (error) throw error;
  assertWritten(data, "The status change");
  window.dispatchEvent(new Event(ORDERS_CHANGED_EVENT));
  // Best-effort: a rejected order shouldn't stay payable at FIB.
  if (next === "cancelled" && order.payment_method === "fib" && order.payment_status === "pending") {
    await cancelFibPayment(order.id).catch(() => {});
  }
}

/** wa.me wants digits only, with country code — assume Iraq (+964). */
export function whatsappLink(phone: string, text?: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `964${digits.slice(1)}`;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** A ready-to-send WhatsApp reply to the customer for the order's current state. */
export function replyTemplate(status: OrderStatus, name: string, ref: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  switch (status) {
    case "requested":
      return `Hello ${first}, this is KurdishTCG about your order #${ref}. Can you confirm it so we can prepare it?`;
    case "confirmed":
      return `Hello ${first}, your KurdishTCG order #${ref} is confirmed and being prepared.`;
    case "shipped":
      return `Hello ${first}, your KurdishTCG order #${ref} is out for delivery today.`;
    case "delivered":
      return `Hello ${first}, thanks for your KurdishTCG order #${ref}! Enjoy your cards.`;
    case "cancelled":
      return `Hello ${first}, sorry — we couldn't fulfil your KurdishTCG order #${ref}.`;
  }
}
