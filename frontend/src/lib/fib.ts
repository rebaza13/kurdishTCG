import "server-only";
import { FibPay, FibPayError } from "fibpay";

export { FibPayError };

export type FibPaymentStatusValue =
  | "UNPAID"
  | "PAID"
  | "DECLINED"
  | "REFUND_REQUESTED"
  | "REFUNDED";

export interface FibPaymentResponse {
  paymentId: string;
  readableCode: string;
  qrCode: string;
  validUntil: string;
  personalAppLink: string;
  businessAppLink: string;
  corporateAppLink: string;
}

export interface FibPaymentStatusResponse {
  paymentId: string;
  status: FibPaymentStatusValue;
  paidAt: string | null;
  amount: { amount: number; currency: string };
  decliningReason: "SERVER_FAILURE" | "PAYMENT_EXPIRATION" | "PAYMENT_CANCELLATION" | null;
  declinedAt: string | null;
  paidBy: { name: string; iban: string } | null;
}

let client: FibPay | null = null;

/**
 * Lazily-built singleton — thrown errors only surface when a route actually
 * needs FIB (missing env vars shouldn't break routes that don't touch it).
 */
function getFibClient(): FibPay {
  if (client) return client;

  const clientId = process.env.FIB_CLIENT_ID;
  const clientSecret = process.env.FIB_CLIENT_SECRET;
  const environment = process.env.FIB_ENVIRONMENT === "production" ? "production" : "stage";

  if (!clientId || !clientSecret) {
    throw new Error(
      "FIB_CLIENT_ID / FIB_CLIENT_SECRET are not set in frontend/.env.local."
    );
  }

  client = new FibPay({ clientId, clientSecret, environment });
  return client;
}

export async function createFibPayment(options: {
  amount: number;
  description?: string;
  callbackUrl?: string;
  redirectUrl?: string;
}): Promise<FibPaymentResponse> {
  return getFibClient().createPayment({ ...options, currency: "IQD" });
}

export async function getFibPaymentStatus(paymentId: string): Promise<FibPaymentStatusResponse> {
  return getFibClient().getStatus(paymentId);
}

export async function cancelFibPayment(paymentId: string): Promise<void> {
  await getFibClient().cancelPayment(paymentId);
}

export async function refundFibPayment(paymentId: string): Promise<void> {
  await getFibClient().refundPayment(paymentId);
}
