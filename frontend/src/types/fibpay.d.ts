declare module "fibpay" {
  export interface FibPayOptions {
    clientId: string;
    clientSecret: string;
    environment?: "stage" | "production";
  }

  export interface CreatePaymentOptions {
    amount: number;
    currency?: string;
    description?: string;
    callbackUrl?: string;
    redirectUrl?: string;
  }

  export interface PaymentResponse {
    paymentId: string;
    readableCode: string;
    qrCode: string;
    validUntil: string;
    personalAppLink: string;
    businessAppLink: string;
    corporateAppLink: string;
  }

  export interface PaymentStatus {
    paymentId: string;
    status: "PAID" | "UNPAID" | "DECLINED" | "REFUND_REQUESTED" | "REFUNDED";
    validUntil?: string;
    paidAt: string | null;
    amount: { amount: number; currency: string };
    decliningReason: "SERVER_FAILURE" | "PAYMENT_EXPIRATION" | "PAYMENT_CANCELLATION" | null;
    declinedAt: string | null;
    paidBy: { name: string; iban: string } | null;
  }

  export class FibPayError extends Error {
    statusCode: number;
    body: unknown;
    constructor(message: string, statusCode: number, body: unknown);
  }

  export class FibPay {
    constructor(options: FibPayOptions);
    createPayment(options: CreatePaymentOptions): Promise<PaymentResponse>;
    getStatus(paymentId: string): Promise<PaymentStatus>;
    cancelPayment(paymentId: string): Promise<null>;
    refundPayment(paymentId: string): Promise<null>;
    waitForStatus(
      paymentId: string,
      options?: { intervalMs?: number; timeoutMs?: number }
    ): Promise<PaymentStatus>;
  }
}
