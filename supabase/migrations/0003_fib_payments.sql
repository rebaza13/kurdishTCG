-- KurdishTCG — FIB ("Pay with FIB") online payment gateway.
--
-- Run once in the Supabase SQL editor (or via the Supabase MCP server), after
-- 0001_admin_dashboard.sql and 0002_iqd_only.sql. Safe to re-run.

-- 1. Payment status, separate from the fulfillment `order_status`. Only
--    meaningful for payment_method = 'fib' — cash orders keep it null.
do $$ begin
  create type public.payment_status as enum (
    'pending', 'paid', 'declined', 'refund_requested', 'refunded'
  );
exception when duplicate_object then null;
end $$;

alter table public.orders
  add column if not exists payment_status public.payment_status,
  add column if not exists fib_payment_id text,
  add column if not exists fib_readable_code text,
  add column if not exists fib_valid_until timestamptz,
  add column if not exists fib_paid_at timestamptz,
  add column if not exists fib_declining_reason text,
  add column if not exists fib_declined_at timestamptz,
  add column if not exists fib_paid_by_name text,
  add column if not exists fib_paid_by_iban text;

do $$ begin
  alter table public.orders
    add constraint orders_payment_status_fib_only
    check (payment_method = 'fib' or payment_status is null);
exception when duplicate_object then null;
end $$;

create unique index if not exists orders_fib_payment_id_idx
  on public.orders (fib_payment_id) where fib_payment_id is not null;
create index if not exists orders_payment_status_idx
  on public.orders (payment_status);

-- 2. SECURITY: order creation moves server-side (Next.js route handler using
--    the service role key), which prices from `products` itself instead of
--    trusting whatever subtotal/total the browser sends — see TODO.md #2.
--    The service role bypasses RLS entirely, so these client-insert policies
--    are no longer needed and are actively a hole (anyone with the public
--    anon key could otherwise insert an order at any price they choose).
drop policy if exists "anyone can place an order" on public.orders;
drop policy if exists "create order items for own order" on public.order_items;
