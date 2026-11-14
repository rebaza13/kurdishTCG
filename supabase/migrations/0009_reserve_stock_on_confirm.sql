-- Take stock when the shop CONFIRMS an order, not when it is placed.
--
-- 0007 decremented `products.stock` as soon as an order was requested, so an
-- unanswered request locked the item away from every other customer. Now a
-- "requested" order holds nothing: stock is taken when the admin moves the
-- order to confirmed / shipped / delivered, and given back if it leaves those
-- states (cancelled, or moved back to requested). Whoever the shop confirms
-- first gets the item; confirming more than is left fails with
-- `out_of_stock:<product_id>`.

-- Statuses that hold stock.
create or replace function public.order_status_holds_stock(s text)
returns boolean
language sql
immutable
as $$ select s in ('confirmed', 'shipped', 'delivered') $$;

-- 1. Placing an order only checks there is enough right now — no decrement.
create or replace function public.reserve_order_item_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.products where id = new.product_id and stock >= new.quantity
  ) then
    raise exception 'out_of_stock:%', new.product_id using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- 2. A deleted line gives its stock back only if its order was holding it.
--    (When the whole order is deleted, step 4 handles it before the cascade.)
create or replace function public.release_order_item_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.order_status_holds_stock(
       (select status from public.orders where id = old.order_id)
     ) then
    update public.products set stock = stock + old.quantity where id = old.product_id;
  end if;
  return old;
end;
$$;

-- 3. Status changes: entering a holding status takes stock (refusing if it
--    has sold out), leaving one gives it back.
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

-- 4. Deleting a confirmed order outright gives its stock back.
create or replace function public.release_order_stock_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.order_status_holds_stock(old.status) then
    update public.products p
       set stock = p.stock + q.qty
      from (select product_id, sum(quantity) as qty
              from public.order_items where order_id = old.id
             group by product_id) q
     where p.id = q.product_id;
  end if;
  return old;
end;
$$;

drop trigger if exists orders_release_stock_on_delete on public.orders;
create trigger orders_release_stock_on_delete
  before delete on public.orders
  for each row execute function public.release_order_stock_on_delete();

revoke execute on function public.release_order_stock_on_delete() from public, anon, authenticated;

-- 5. One-off: open "requested" orders were already holding stock under 0007 —
--    give it back so the new rule applies to them too.
update public.products p
   set stock = p.stock + q.qty
  from (select oi.product_id, sum(oi.quantity) as qty
          from public.order_items oi
          join public.orders o on o.id = oi.order_id
         where o.status = 'requested'
         group by oi.product_id) q
 where p.id = q.product_id;
