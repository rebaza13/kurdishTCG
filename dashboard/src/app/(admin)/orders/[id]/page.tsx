"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock,
  MessageCircle,
  PackageCheck,
  Phone,
  RefreshCw,
  RotateCcw,
  ThumbsUp,
  Truck,
  XCircle,
} from "lucide-react";
import type { OrderStatus, PaymentStatus } from "@tcg/types";
import { errorMessage, getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { STATUS_LABEL, dateTime, money, shortId } from "@/lib/format";
import { cancelFibPayment, refundFibPayment } from "@/lib/fib-admin";
import {
  NEXT_STEP,
  PIPELINE,
  canReject,
  previousStep,
  replyTemplate,
  setOrderStatus,
  whatsappLink,
} from "@/lib/order-actions";
import { cn } from "@/lib/utils";
import {
  Button,
  Card,
  ConfirmButton,
  ErrorWithRetry,
  Notice,
  PaymentStatusBadge,
  Spinner,
  StatusBadge,
} from "@/components/ui";

interface OrderDetail {
  id: string;
  status: OrderStatus;
  payment_method: string;
  payment_status: PaymentStatus | null;
  fib_readable_code: string | null;
  fib_paid_at: string | null;
  fib_declining_reason: string | null;
  fib_paid_by_name: string | null;
  fib_paid_by_iban: string | null;
  full_name: string;
  phone: string;
  city: string;
  address: string;
  notes: string | null;
  subtotal: number | string;
  total: number | string;
  currency: string;
  created_at: string;
  order_items: {
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number | string;
  }[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STEP_ICON: Record<string, typeof Clock> = {
  requested: Clock,
  confirmed: ThumbsUp,
  shipped: Truck,
  delivered: PackageCheck,
};

const NEXT_ICON: Partial<Record<OrderStatus, typeof Clock>> = {
  requested: Check,
  confirmed: Truck,
  shipped: PackageCheck,
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right">{children}</dd>
    </div>
  );
}

/** Pending → Confirmed → Out for delivery → Delivered. */
function Stepper({ status }: { status: OrderStatus }) {
  const current = PIPELINE.indexOf(status);
  const rejected = status === "cancelled";
  return (
    <ol className="grid grid-cols-4">
      {PIPELINE.map((s, i) => {
        const Icon = STEP_ICON[s];
        const done = !rejected && i < current;
        const active = !rejected && i === current;
        const final = active && s === "delivered";
        return (
          <li key={s} className="relative flex flex-col items-center gap-2 text-center">
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  "absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2",
                  !rejected && i <= current ? "bg-accent" : "bg-line"
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 items-center justify-center rounded-full border-2 transition-colors",
                final
                  ? "border-ok bg-ok text-accent-fg"
                  : done || active
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-line bg-surface text-muted",
                active && !final && "ring-4 ring-accent/20"
              )}
            >
              {done ? <Check className="size-4" /> : <Icon className="size-4" />}
            </span>
            <span
              className={cn(
                "px-0.5 text-[11px] leading-tight sm:text-xs",
                active ? "font-semibold text-fg" : done ? "text-fg" : "text-muted"
              )}
            >
              {STATUS_LABEL[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [saving, setSaving] = useState<OrderStatus | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [paymentAction, setPaymentAction] = useState<"refund" | "cancel" | null>(null);
  const [paymentActionError, setPaymentActionError] = useState<string | null>(null);

  const { data: order, error, reload } = useQuery(async () => {
    // A malformed id would otherwise surface Postgres' "invalid input syntax
    // for type uuid" instead of a plain "not found".
    if (!UUID_RE.test(id)) return null;
    const { data, error } = await getSupabase()
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as OrderDetail | null;
  }, [id]);

  async function changeStatus(next: OrderStatus) {
    if (!order) return;
    setActionError(null);
    setSaving(next);
    try {
      await setOrderStatus(order, next);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  async function runPaymentAction(kind: "refund" | "cancel") {
    setPaymentActionError(null);
    setPaymentAction(kind);
    try {
      await (kind === "refund" ? refundFibPayment(id) : cancelFibPayment(id));
      reload();
    } catch (err) {
      setPaymentActionError(errorMessage(err));
    } finally {
      setPaymentAction(null);
    }
  }

  const back = (
    <Link
      href="/orders"
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
    >
      <ArrowLeft className="size-4" /> Orders
    </Link>
  );

  if (order === undefined) {
    return (
      <>
        {back}
        {error ? <ErrorWithRetry error={error} onRetry={reload} /> : <Spinner />}
      </>
    );
  }
  if (order === null) {
    return (
      <>
        {back}
        <Notice>Order not found.</Notice>
      </>
    );
  }

  const step = NEXT_STEP[order.status];
  const NextIcon = NEXT_ICON[order.status];
  const prev = previousStep(order.status);
  const paidOnline = order.payment_method === "fib" && order.payment_status === "paid";
  const ref = shortId(order.id);
  const itemCount = order.order_items.reduce((n, i) => n + i.quantity, 0);

  return (
    <>
      {back}

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Order #{ref}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {dateTime(order.created_at)} · {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
            <span className="font-medium text-fg">{money(order.total, order.currency)}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Status + actions — first thing on every screen size. */}
        <Card className="p-4 sm:p-5 lg:col-span-2">
          {order.status === "cancelled" ? (
            <div className="flex items-start gap-3 rounded-lg bg-danger/10 px-3 py-3 text-sm text-danger">
              <XCircle className="mt-0.5 size-5 shrink-0" />
              <div>
                <div className="font-semibold">This order was rejected</div>
                <div className="text-danger/80">Its stock has been put back on sale.</div>
              </div>
            </div>
          ) : (
            <Stepper status={order.status} />
          )}

          {actionError && (
            <div className="mt-4">
              <Notice>{actionError}</Notice>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {step && (
              <Button
                variant="primary"
                className="h-11 w-full sm:w-auto sm:min-w-48"
                loading={saving === step.to}
                disabled={saving !== null}
                onClick={() => changeStatus(step.to)}
              >
                {NextIcon && saving !== step.to && <NextIcon className="size-4" />}
                {step.label}
              </Button>
            )}
            {canReject(order.status) && (
              <ConfirmButton
                className="h-11 w-full sm:w-auto"
                loading={saving === "cancelled"}
                disabled={saving !== null}
                onConfirm={() => changeStatus("cancelled")}
                confirmLabel="Tap again to reject"
              >
                <XCircle className="size-4" /> Reject order
              </ConfirmButton>
            )}
            {order.status === "cancelled" && (
              <Button
                variant="primary"
                className="h-11 w-full sm:w-auto"
                loading={saving === "requested"}
                disabled={saving !== null}
                onClick={() => changeStatus("requested")}
              >
                <RotateCcw className="size-4" /> Reopen as pending
              </Button>
            )}
            {order.status === "delivered" && (
              <p className="text-sm text-ok">Delivered — this order is complete.</p>
            )}
            {prev && (
              <Button
                variant="ghost"
                size="sm"
                className="self-start sm:ml-auto sm:self-auto"
                disabled={saving !== null}
                loading={saving === prev}
                onClick={() => changeStatus(prev)}
              >
                <RotateCcw className="size-3.5" /> Undo — back to {STATUS_LABEL[prev].toLowerCase()}
              </Button>
            )}
          </div>

          {paidOnline && (canReject(order.status) || order.status === "cancelled") && (
            <p className="mt-3 rounded-lg bg-warn/10 px-3 py-2 text-xs text-warn">
              {order.status === "cancelled"
                ? "This order is rejected but its FIB payment is still paid — refund it below."
                : "This order was paid with FIB. Rejecting does not return the money — refund the payment below as well."}
            </p>
          )}
        </Card>

        {/* Customer + reply */}
        <Card className="p-4 sm:p-5 lg:order-2">
          <h2 className="mb-1 text-sm font-semibold">Customer</h2>
          <dl className="divide-y divide-line">
            <Row label="Name">{order.full_name}</Row>
            <Row label="Phone">
              <a href={`tel:${order.phone.replace(/\s+/g, "")}`} dir="ltr" className="hover:text-accent">
                {order.phone}
              </a>
            </Row>
            <Row label="City">{order.city}</Row>
            <Row label="Address">{order.address}</Row>
            {order.notes && <Row label="Notes">{order.notes}</Row>}
          </dl>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a
              href={`tel:${order.phone.replace(/\s+/g, "")}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line text-sm font-medium hover:bg-surface-2"
            >
              <Phone className="size-4" /> Call
            </a>
            <a
              href={whatsappLink(order.phone, replyTemplate(order.status, order.full_name, ref))}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line text-sm font-medium hover:bg-surface-2"
            >
              <MessageCircle className="size-4" /> WhatsApp
            </a>
          </div>
          <p className="mt-2 text-xs text-muted">
            WhatsApp opens with a message ready for the current status.
          </p>
        </Card>

        {/* Items */}
        <Card className="min-w-0 lg:order-1">
          <div className="border-b border-line px-4 py-3 text-sm font-semibold sm:px-5">
            Items
          </div>
          {order.order_items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted [overflow-wrap:anywhere]">
              No line items visible. If this order has items, the database is missing the admin
              read policy from migration 0005_order_items_admin_read.sql.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {order.order_items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <Link
                      href={`/products/${encodeURIComponent(item.product_id)}`}
                      className="break-words text-sm font-medium hover:text-accent"
                    >
                      {item.product_name}
                    </Link>
                    <div className="text-xs text-muted tabular-nums">
                      {item.quantity} × {money(item.unit_price, order.currency)}
                    </div>
                  </div>
                  <div className="shrink-0 text-sm tabular-nums">
                    {money(Number(item.unit_price) * item.quantity, order.currency)}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <dl className="divide-y divide-line border-t border-line px-4 sm:px-5">
            <Row label="Payment">
              {order.payment_method === "cash" ? "Cash on delivery" : "Pay with FIB"}
            </Row>
            <Row label="Total">
              <span className="text-base font-semibold">{money(order.total, order.currency)}</span>
            </Row>
          </dl>
        </Card>

        {order.payment_method === "fib" && (
          <Card className="p-4 sm:p-5 lg:order-3 lg:col-start-2">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Payment</h2>
              {order.payment_status && <PaymentStatusBadge status={order.payment_status} />}
            </div>
            <dl className="divide-y divide-line">
              {order.fib_readable_code && (
                <Row label="FIB code">
                  <span dir="ltr">{order.fib_readable_code}</span>
                </Row>
              )}
              {order.fib_paid_at && <Row label="Paid at">{dateTime(order.fib_paid_at)}</Row>}
              {order.fib_paid_by_name && <Row label="Paid by">{order.fib_paid_by_name}</Row>}
              {order.fib_paid_by_iban && (
                <Row label="IBAN">
                  <span dir="ltr">{order.fib_paid_by_iban}</span>
                </Row>
              )}
              {order.fib_declining_reason && (
                <Row label="Decline reason">{order.fib_declining_reason}</Row>
              )}
            </dl>
            {paymentActionError && (
              <div className="mt-3">
                <Notice>{paymentActionError}</Notice>
              </div>
            )}
            {order.payment_status === "paid" && (
              <div className="mt-3">
                <ConfirmButton
                  loading={paymentAction === "refund"}
                  disabled={paymentAction !== null}
                  onConfirm={() => runPaymentAction("refund")}
                  confirmLabel="Click again to refund"
                >
                  Refund payment
                </ConfirmButton>
              </div>
            )}
            {order.payment_status === "pending" && (
              <Button
                className="mt-3"
                variant="secondary"
                loading={paymentAction === "cancel"}
                disabled={paymentAction !== null}
                onClick={() => runPaymentAction("cancel")}
              >
                <RefreshCw className="size-3.5" /> Cancel FIB payment
              </Button>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
