-- Customer marketplace: any signed-in customer can list their own cards.
--
--   * A listing is an ordinary `products` row with `seller_id` set (null = the
--     shop's own stock). It shows on the storefront like any other product,
--     and checkout / stock reservation work unchanged.
--   * Each order line remembers which seller it belongs to, plus a snapshot of
--     the seller's name + WhatsApp number (so the buyer can contact them
--     without profiles being readable) and the product photo (so the order
--     still shows a picture after the listing is deleted).
--   * Two-sided completion per line: the seller marks "I received the money"
--     (seller_paid_at), the buyer marks "I received my order"
--     (buyer_received_at). When both are set and the listing's stock is 0,
--     the app deletes the listing and its photos to free storage
--     (frontend/src/lib/listings.ts).
--
-- All seller writes go through frontend API routes (service role), so no new
-- RLS write policies are needed. Safe to re-run.

-- 1. Seller contact number (WhatsApp), on the customer's profile.
alter table public.profiles add column if not exists whatsapp text;

-- 2. Who listed a product. Deleting the account deletes their listings.
alter table public.products
  add column if not exists seller_id uuid references auth.users(id) on delete cascade;
alter table public.products add column if not exists seller_name text;
create index if not exists products_seller_idx on public.products (seller_id);

-- 3. Order lines: seller + snapshots + the two confirmations.
alter table public.order_items
  add column if not exists seller_id uuid references auth.users(id) on delete set null;
alter table public.order_items add column if not exists seller_name text;
alter table public.order_items add column if not exists seller_whatsapp text;
alter table public.order_items add column if not exists product_image text;
alter table public.order_items add column if not exists seller_paid_at timestamptz;
alter table public.order_items add column if not exists buyer_received_at timestamptz;
create index if not exists order_items_seller_idx on public.order_items (seller_id);
create index if not exists order_items_product_idx on public.order_items (product_id);

-- 4. A completed listing gets deleted, but its order lines must survive
--    (product_name / unit_price / product_image are snapshots). Make the FK
--    nullable + ON DELETE SET NULL instead of blocking the delete.
alter table public.order_items alter column product_id drop not null;

do $$
declare
  fk text;
begin
  select con.conname into fk
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
   where con.conrelid = 'public.order_items'::regclass
     and con.contype = 'f'
     and att.attname = 'product_id'
   limit 1;
  if fk is not null then
    execute format('alter table public.order_items drop constraint %I', fk);
  end if;
end $$;

alter table public.order_items
  add constraint order_items_product_id_fkey
  foreign key (product_id) references public.products(id) on delete set null;

-- 5. Backfill photos on existing order lines.
update public.order_items oi
   set product_image = p.image
  from public.products p
 where p.id = oi.product_id
   and oi.product_image is null;
