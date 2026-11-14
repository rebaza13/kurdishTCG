-- Back to reserving stock the moment an order is placed (the 0007 rule):
--
--   * Placing an order takes the stock right away, so other customers see
--     the item as sold out instead of ordering something that's already gone.
--   * Cancelling / rejecting the order gives the stock back.
--   * Confirming, shipping and delivering change nothing (already taken).
--   * No automatic cancelling of other customers' orders (undoes 0010).

-- Every status except "cancelled" holds stock.
create or replace function public.order_status_holds_stock(s text)
returns boolean
language sql
immutable
as $$ select s is not null and s <> 'cancelled' $$;

-- 1. Placing an order takes the stock (refusing if there isn't enough).
create or replace function public.reserve_order_item_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
     set stock = stock - new.quantity
   where id = new.product_id
     and stock >= new.quantity;
  if not found then
    raise exception 'out_of_stock:%', new.product_id using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- 2. Status changes: cancelling gives stock back; reopening a cancelled
--    order takes it again (refusing if it sold out meanwhile).
create or replace function public.sync_order_stock_on_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  was_held boolean := public.order_status_holds_stock(old.status);
  now_held boolean := public.order_status_holds_stock(new.status);
  short_product text;
begin
  if now_held and not was_held then
    select q.product_id into short_product
      from (select product_id, sum(quantity) as qty
              from public.order_items where order_id = new.id
             group by product_id) q
      join public.products p on p.id = q.product_id
     where p.stock < q.qty
     limit 1;
    if short_product is not null then
      raise exception 'out_of_stock:%', short_product using errcode = 'P0001';
    end if;

    update public.products p
       set stock = p.stock - q.qty
      from (select product_id, sum(quantity) as qty
              from public.order_items where order_id = new.id
             group by product_id) q
     where p.id = q.product_id;

  elsif was_held and not now_held then
    update public.products p
       set stock = p.stock + q.qty
      from (select product_id, sum(quantity) as qty
              from public.order_items where order_id = new.id
             group by product_id) q
     where p.id = q.product_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_order_stock_on_status() from public, anon, authenticated;

-- (release_order_item_stock and release_order_stock_on_delete from 0009 use
--  order_status_holds_stock, so they now follow the rule above unchanged.)

-- 3. One-off: open "requested" orders gave their stock back under 0009 —
--    take it again. Clamped at 0 in case others ordered in the meantime.
update public.products p
   set stock = greatest(p.stock - q.qty, 0)
  from (select oi.product_id, sum(oi.quantity) as qty
          from public.order_items oi
          join public.orders o on o.id = oi.order_id
         where o.status = 'requested'
         group by oi.product_id) q
 where p.id = q.product_id;
