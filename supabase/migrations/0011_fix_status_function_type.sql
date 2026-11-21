-- Fix: Accept / Reject / any status change failed with
--   "function public.order_status_holds_stock(order_status) does not exist"
--
-- 0009/0010 defined order_status_holds_stock(s text), but the triggers pass
-- orders.status, which is the enum public.order_status. Postgres does not
-- implicitly cast an enum to text when picking a function, so every status
-- update (and deleting an order) errored inside the stock trigger.
--
-- Add an overload that takes the enum and forwards to the text version, so
-- every existing caller resolves without rewriting the triggers. Safe to
-- run more than once.

create or replace function public.order_status_holds_stock(s public.order_status)
returns boolean
language sql
immutable
as $$ select public.order_status_holds_stock(s::text) $$;
