-- Bug found live 2026-09-22: the admin dashboard can see an order's summary
-- (orders SELECT policy already has the is_admin() bypass, added in
-- 0001_admin_dashboard.sql) but its line items always come back empty,
-- because the order_items SELECT policy was never updated to match — it
-- only allows the order's own customer (o.user_id = auth.uid()), not admins.
-- Reproduced directly: querying as a real admin session returns
-- order.order_items: [] for a real order that has real order_items rows
-- (confirmed present via service role). This makes it impossible for the
-- shop owner to see what a customer ordered.
drop policy if exists "read order items for visible orders" on public.order_items;
create policy "read order items for visible orders"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );
