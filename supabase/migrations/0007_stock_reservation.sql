-- Reserve stock when an order is placed, give it back when the order is
-- cancelled. Before this, `products.stock` was only ever read by checkout, so
-- two customers could both buy the last copy of a card.
--
-- The decrement is a guarded UPDATE (`stock >= quantity`), so concurrent
-- checkouts serialize on the product row and the loser's order_items insert
-- fails with `out_of_stock:<product_id>` — checkout maps that to a 409.

-- 1. Take stock as order lines are inserted.
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

drop trigger if exists order_items_reserve_stock on public.order_items;
create trigger order_items_reserve_stock
  before insert on public.order_items
  for each row execute function public.reserve_order_item_stock();

-- 2. Give stock back when a line disappears (order deleted, e.g. checkout
--    rolling back a half-created order), unless its order was already
--    cancelled — cancelling has restocked it already.
create or replace function public.release_order_item_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(
       (select status from public.orders where id = old.order_id),
       'requested'
     ) <> 'cancelled' then
    update public.products set stock = stock + old.quantity where id = old.product_id;
  end if;
  return old;
end;
$$;

drop trigger if exists order_items_release_stock on public.order_items;
create trigger order_items_release_stock
  after delete on public.order_items
  for each row execute function public.release_order_item_stock();

-- 3. Cancelling an order restocks it; reopening a cancelled order takes the
--    stock again (and refuses if it has sold out in the meantime).
create or replace function public.sync_order_stock_on_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  short_product text;
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.products p
       set stock = p.stock + q.qty
      from (select product_id, sum(quantity) as qty
              from public.order_items where order_id = new.id
             group by product_id) q
     where p.id = q.product_id;

  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
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
  end if;
  return new;
end;
$$;

drop trigger if exists orders_sync_stock on public.orders;
create trigger orders_sync_stock
  after update of status on public.orders
  for each row execute function public.sync_order_stock_on_status();

-- Only triggers call these.
revoke execute on function public.reserve_order_item_stock() from public, anon, authenticated;
revoke execute on function public.release_order_item_stock() from public, anon, authenticated;
revoke execute on function public.sync_order_stock_on_status() from public, anon, authenticated;
