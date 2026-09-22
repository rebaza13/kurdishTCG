-- Prevent duplicate orders (and duplicate FIB payments) from a double-submit
-- or retried network request on POST /api/checkout. The client sends one
-- idempotency key per checkout attempt; a second request with the same key
-- is detected instead of creating a second order.
alter table public.orders add column if not exists idempotency_key text;

create unique index if not exists orders_idempotency_key_key
  on public.orders (idempotency_key)
  where idempotency_key is not null;
