"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MessageCircle, Phone } from "lucide-react";
import type { OrderStatus } from "@tcg/types";
import { assertWritten, errorMessage, getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { NEXT_STATUSES, STATUS_LABEL, dateTime, money, shortId } from "@/lib/format";
import {
  Button,
  Card,
  ConfirmButton,
  Notice,
  PageHeader,
  Spinner,
  StatusBadge,
} from "@/components/ui";

interface OrderDetail {
  id: string;
  status: OrderStatus;
  payment_method: string;
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

/** wa.me wants digits only, with country code — assume Iraq (+964). */
function whatsappLink(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `964${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [saving, setSaving] = useState<OrderStatus | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: order, error, reload } = useQuery(async () => {
    const { data, error } = await getSupabase()
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as OrderDetail | null;
  }, [id]);

  async function changeStatus(next: OrderStatus) {
    setActionError(null);
    setSaving(next);
    try {
      const { data, error } = await getSupabase()
        .from("orders")
        .update({ status: next })
        .eq("id", id)
        .select("id");
      if (error) throw error;
      assertWritten(data, "The status change");
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSaving(null);
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
        {error ? <Notice>{error}</Notice> : <Spinner />}
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

  const next = NEXT_STATUSES[order.status] ?? [];

  return (
    <>
      {back}
      <PageHeader
        title={`Order #${shortId(order.id)}`}
        subtitle={dateTime(order.created_at)}
        actions={<StatusBadge status={order.status} />}
      />

      {actionError && (
        <div className="mb-4">
          <Notice>{actionError}</Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <div className="border-b border-line px-4 py-3 text-sm font-semibold">Items</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="px-4 py-2.5 font-medium">Product</th>
                    <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                    <th className="px-4 py-2.5 text-right font-medium">Price</th>
                    <th className="px-4 py-2.5 text-right font-medium">Line</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {order.order_items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/products/${encodeURIComponent(item.product_id)}`}
                          className="hover:text-accent"
                        >
                          {item.product_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {money(item.unit_price, order.currency)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {money(Number(item.unit_price) * item.quantity, order.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="divide-y divide-line border-t border-line px-4">
              <Row label="Subtotal">{money(order.subtotal, order.currency)}</Row>
              <Row label="Total">
                <span className="text-base font-semibold">
                  {money(order.total, order.currency)}
                </span>
              </Row>
              <Row label="Payment">
                {order.payment_method === "cash" ? "Cash on delivery" : order.payment_method}
              </Row>
            </dl>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold">Update status</h2>
            {next.length === 0 ? (
              <p className="text-sm text-muted">
                This order is {STATUS_LABEL[order.status].toLowerCase()} — nothing further to do.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {next.map((s) =>
                  s === "cancelled" ? (
                    <ConfirmButton
                      key={s}
                      loading={saving === s}
                      disabled={saving !== null}
                      onConfirm={() => changeStatus(s)}
                    >
                      Cancel order
                    </ConfirmButton>
                  ) : (
                    <Button
                      key={s}
                      variant={s === next[0] ? "primary" : "secondary"}
                      loading={saving === s}
                      disabled={saving !== null}
                      onClick={() => changeStatus(s)}
                    >
                      {s === "requested" ? "Reopen" : `Mark ${STATUS_LABEL[s].toLowerCase()}`}
                    </Button>
                  )
                )}
              </div>
            )}
            <p className="mt-3 text-xs text-muted">
              Stock is not changed automatically — adjust it on the product.
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold">Customer</h2>
            <dl className="divide-y divide-line">
              <Row label="Name">{order.full_name}</Row>
              <Row label="Phone">
                <span dir="ltr">{order.phone}</span>
              </Row>
              <Row label="City">{order.city}</Row>
              <Row label="Address">{order.address}</Row>
              {order.notes && <Row label="Notes">{order.notes}</Row>}
            </dl>
            <div className="mt-3 flex gap-2">
              <a
                href={`tel:${order.phone.replace(/\s+/g, "")}`}
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-line px-3 text-xs font-medium hover:bg-surface-2"
              >
                <Phone className="size-3.5" /> Call
              </a>
              <a
                href={whatsappLink(order.phone)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-line px-3 text-xs font-medium hover:bg-surface-2"
              >
                <MessageCircle className="size-3.5" /> WhatsApp
              </a>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
