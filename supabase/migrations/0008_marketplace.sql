-- KurdishTCG community marketplace: signed-in customers list their own
-- single cards, sealed packs, or bundles (e.g. 10 cards for one price), and
-- other customers order them for cash-on-delivery straight from the seller.
--
--   seller_profiles  one row per seller — contact phone (WhatsApp or Viber),
--                    ships-from governorate and address. Filled once, before
--                    the first listing. Private: only the owner can read it.
--   listings         what's for sale. `cards` holds one {front, back?, name?}
--                    per card photo pair. seller_name/seller_city are copied
--                    from the profile so listing pages never need the
--                    private profile row.
--   listing_orders   a buyer's order for a listing. Created only by the
--                    /api/market/orders route (service role); the seller is
--                    notified on WhatsApp, or Viber when that's their channel
--                    or WhatsApp can't reach them.
--
-- Run after 0007_stock_reservation.sql. Safe to re-run.

-- Governorate codes shared by the map component (src/lib/iraq-cities.ts).
create or replace function public.is_iraq_city(code text)
returns boolean
language sql
immutable
as $$
  select code = any (array[
    'baghdad','basra','ninawa','erbil','sulaymaniyah','duhok','kirkuk','anbar',
    'babil','diyala','wasit','maysan','dhiqar','qadisiyah','muthanna','karbala',
    'najaf','salahaddin'
  ]);
$$;

-- ── Seller profiles ────────────────────────────────────────────────────────
create table if not exists public.seller_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  phone text not null check (phone ~ '^07[0-9]{9}$'),
  contact_channel text not null default 'whatsapp'
    check (contact_channel in ('whatsapp', 'viber')),
  city text not null check (public.is_iraq_city(city)),
  address text not null check (char_length(address) between 3 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seller_profiles enable row level security;
drop policy if exists "sellers read own profile" on public.seller_profiles;
create policy "sellers read own profile"
  on public.seller_profiles for select
  using (auth.uid() = user_id or public.is_admin());
drop policy if exists "sellers create own profile" on public.seller_profiles;
create policy "sellers create own profile"
  on public.seller_profiles for insert
  with check (auth.uid() = user_id);
drop policy if exists "sellers update own profile" on public.seller_profiles;
create policy "sellers update own profile"
  on public.seller_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Listings ───────────────────────────────────────────────────────────────
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('single', 'pack', 'bundle')),
  title text not null check (char_length(title) between 2 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  franchise_slug text references public.franchises(slug) on delete set null,
  condition text not null default 'near_mint'
    check (condition in ('sealed', 'mint', 'near_mint', 'excellent', 'good', 'played')),
  price numeric(12, 0) not null check (price between 250 and 100000000),
  quantity integer not null default 1 check (quantity between 0 and 999),
  card_count integer not null default 1 check (card_count between 1 and 500),
  cards jsonb not null default '[]'::jsonb,
  cover text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'sold')),
  seller_name text not null default '',
  seller_city text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_status_created_idx on public.listings (status, created_at desc);
create index if not exists listings_seller_idx on public.listings (seller_id);
create index if not exists listings_franchise_idx on public.listings (franchise_slug);

-- Validate photos, stamp seller details, keep the owner fixed.
create or replace function public.listings_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.seller_profiles%rowtype;
  card jsonb;
  prefix text;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then new.seller_id := auth.uid(); end if;
  elsif new.seller_id is distinct from old.seller_id then
    raise exception 'seller_id is immutable';
  end if;

  select * into prof from public.seller_profiles where user_id = new.seller_id;
  if not found then
    raise exception 'seller_profile_required' using errcode = 'P0001';
  end if;
  new.seller_name := prof.display_name;
  new.seller_city := prof.city;

  if jsonb_typeof(new.cards) <> 'array'
     or jsonb_array_length(new.cards) not between 1 and 30 then
    raise exception 'invalid_cards' using errcode = 'P0001';
  end if;

  -- Photos must be this seller's own uploads in the listing-images bucket.
  prefix := '%/storage/v1/object/public/listing-images/' || new.seller_id::text || '/%';
  for card in select * from jsonb_array_elements(new.cards) loop
    if jsonb_typeof(card) <> 'object'
       or coalesce(card ->> 'front', '') not like prefix
       or (card ? 'back' and card ->> 'back' is not null and card ->> 'back' not like prefix)
       or char_length(coalesce(card ->> 'name', '')) > 80 then
      raise exception 'invalid_cards' using errcode = 'P0001';
    end if;
  end loop;

  new.cover := new.cards -> 0 ->> 'front';
  if new.kind = 'single' then new.card_count := 1; end if;
  if new.quantity = 0 and new.status = 'active' then new.status := 'sold'; end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists listings_before_write on public.listings;
create trigger listings_before_write
  before insert or update on public.listings
  for each row execute function public.listings_before_write();

-- Renaming yourself or moving city updates your live listings.
create or replace function public.seller_profiles_sync_listings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.display_name is distinct from old.display_name or new.city is distinct from old.city then
    update public.listings
       set seller_name = new.display_name, seller_city = new.city
     where seller_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists seller_profiles_sync_listings on public.seller_profiles;
create trigger seller_profiles_sync_listings
  before update on public.seller_profiles
  for each row execute function public.seller_profiles_sync_listings();

alter table public.listings enable row level security;
drop policy if exists "listings are publicly readable" on public.listings;
create policy "listings are publicly readable"
  on public.listings for select
  using (status <> 'paused' or seller_id = auth.uid() or public.is_admin());
drop policy if exists "sellers create listings" on public.listings;
create policy "sellers create listings"
  on public.listings for insert
  with check (seller_id = auth.uid());
drop policy if exists "sellers update own listings" on public.listings;
create policy "sellers update own listings"
  on public.listings for update
  using (seller_id = auth.uid() or public.is_admin())
  with check (seller_id = auth.uid() or public.is_admin());
drop policy if exists "sellers delete own listings" on public.listings;
create policy "sellers delete own listings"
  on public.listings for delete
  using (seller_id = auth.uid() or public.is_admin());

-- ── Listing orders ─────────────────────────────────────────────────────────
create table if not exists public.listing_orders (
  id uuid primary key,                    -- client-generated: idempotent submits
  listing_id uuid references public.listings(id) on delete set null,
  seller_id uuid not null references auth.users(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  listing_title text not null,
  listing_cover text not null,
  unit_price numeric(12, 0) not null,
  quantity integer not null check (quantity between 1 and 99),
  total numeric(12, 0) not null,
  buyer_name text not null check (char_length(buyer_name) between 2 and 120),
  buyer_phone text not null check (buyer_phone ~ '^07[0-9]{9}$'),
  buyer_city text not null check (public.is_iraq_city(buyer_city)),
  buyer_address text not null check (char_length(buyer_address) between 3 and 500),
  notes text check (char_length(notes) <= 1000),
  seller_name text not null,
  seller_phone text not null,
  seller_city text not null,
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  notify_channel text check (notify_channel in ('whatsapp', 'viber')),
  notify_status text not null default 'pending'
    check (notify_status in ('pending', 'sent', 'failed', 'skipped')),
  notify_ref text,
  notify_error text,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listing_orders_seller_idx on public.listing_orders (seller_id, created_at desc);
create index if not exists listing_orders_buyer_idx on public.listing_orders (buyer_id, created_at desc);
create index if not exists listing_orders_notify_ref_idx on public.listing_orders (notify_ref) where notify_ref is not null;

-- Reserve quantity on order; the guarded UPDATE serializes concurrent buyers.
create or replace function public.listing_orders_reserve()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.listings
     set quantity = quantity - new.quantity,
         status = case when quantity - new.quantity = 0 then 'sold' else status end
   where id = new.listing_id
     and status = 'active'
     and quantity >= new.quantity;
  if not found then
    raise exception 'out_of_stock:%', new.listing_id using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists listing_orders_reserve on public.listing_orders;
create trigger listing_orders_reserve
  before insert on public.listing_orders
  for each row execute function public.listing_orders_reserve();

-- Status changes: sellers move an order forward or cancel it; buyers may
-- only cancel while it's still `requested`. Cancelling gives quantity back.
create or replace function public.listing_orders_on_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rank_old int := array_position(array['requested','confirmed','shipped','delivered'], old.status);
  rank_new int := array_position(array['requested','confirmed','shipped','delivered'], new.status);
begin
  if new.status is not distinct from old.status then return new; end if;

  if uid is not null and not public.is_admin() then
    if old.status in ('delivered', 'cancelled') then
      raise exception 'order_closed' using errcode = 'P0001';
    end if;
    if uid = old.seller_id then
      if new.status <> 'cancelled' and rank_new <= rank_old then
        raise exception 'invalid_transition' using errcode = 'P0001';
      end if;
    elsif uid = old.buyer_id then
      if not (old.status = 'requested' and new.status = 'cancelled') then
        raise exception 'invalid_transition' using errcode = 'P0001';
      end if;
    else
      raise exception 'not_allowed' using errcode = 'P0001';
    end if;
  end if;

  if new.status = 'cancelled' and new.listing_id is not null then
    update public.listings
       set quantity = quantity + old.quantity,
           status = case when status = 'sold' then 'active' else status end
     where id = new.listing_id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists listing_orders_on_status on public.listing_orders;
create trigger listing_orders_on_status
  before update on public.listing_orders
  for each row execute function public.listing_orders_on_status();

revoke execute on function public.listings_before_write() from public, anon, authenticated;
revoke execute on function public.seller_profiles_sync_listings() from public, anon, authenticated;
revoke execute on function public.listing_orders_reserve() from public, anon, authenticated;
revoke execute on function public.listing_orders_on_status() from public, anon, authenticated;

alter table public.listing_orders enable row level security;
drop policy if exists "parties read their orders" on public.listing_orders;
create policy "parties read their orders"
  on public.listing_orders for select
  using (auth.uid() in (buyer_id, seller_id) or public.is_admin());
drop policy if exists "parties update order status" on public.listing_orders;
create policy "parties update order status"
  on public.listing_orders for update
  using (auth.uid() in (buyer_id, seller_id) or public.is_admin())
  with check (auth.uid() in (buyer_id, seller_id) or public.is_admin());

-- Signed-in users may only ever change `status` (column privilege), and the
-- trigger above decides which transitions they're allowed.
revoke insert, update, delete on public.listing_orders from anon, authenticated;
grant update (status) on public.listing_orders to authenticated;

-- ── Storage: seller photos ─────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sellers upload own listing images" on storage.objects;
create policy "sellers upload own listing images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "sellers delete own listing images" on storage.objects;
create policy "sellers delete own listing images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Seller's storefront language, so order notifications reach them in it.
alter table public.seller_profiles
  add column if not exists locale text not null default 'ckb'
  check (locale in ('en', 'ar', 'ckb'));
