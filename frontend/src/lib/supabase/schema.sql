-- KurdishTCG marketplace schema — v2
-- Applied via the Supabase MCP server. Mirrors the shapes in
-- packages/types/index.ts so `lib/data` (Supabase-backed) needs no type
-- drift from the storefront components.
--
-- Franchises sold: Riftbound (League of Legends TCG), Naruto (Kayou),
-- Disney Lorcana, Avatar: The Last Airbender (Weiß Schwarz), SpongeBob,
-- Zootopia. Every product carries English, Arabic and Sorani Kurdish text
-- so the storefront reads correctly in all three locales without a
-- runtime translation step.

create extension if not exists "pgcrypto";

-- ── Settings (single row, admin-editable) ──────────────────────────────────
create table if not exists public.settings (
  id boolean primary key default true constraint settings_singleton check (id),
  currency text not null default 'IQD',
  whatsapp_number text,
  contact_email text,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (true) on conflict (id) do nothing;

alter table public.settings enable row level security;
create policy "settings are publicly readable"
  on public.settings for select
  using (true);

-- ── Profiles (extends Supabase auth.users) ─────────────────────────────────
create type public.user_role as enum ('customer', 'admin');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "users read their own profile"
  on public.profiles for select
  using (auth.uid() = id);
create policy "users update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up (email or Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by RLS policies below: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── Franchises ────────────────────────────────────────────────────────────
create table if not exists public.franchises (
  slug text primary key,
  name_en text not null,
  name_ar text not null,
  name_ckb text not null,
  accent text not null,          -- css color/var reference
  badge_en text not null,
  badge_ar text not null,
  badge_ckb text not null,
  description_en text not null,
  description_ar text not null,
  description_ckb text not null,
  image text not null,
  sort_order smallint not null default 0
);

alter table public.franchises enable row level security;
create policy "franchises are publicly readable"
  on public.franchises for select
  using (true);
create policy "admins manage franchises"
  on public.franchises for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── Products ──────────────────────────────────────────────────────────────
create type public.rarity as enum (
  'common', 'uncommon', 'rare', 'holo', 'ultra', 'secret', 'promo'
);

create type public.product_type as enum (
  'single_card', 'booster_pack', 'booster_box', 'starter_deck', 'blaster_box', 'collection_box'
);

create table if not exists public.products (
  id text primary key,
  slug text not null,
  franchise_slug text not null references public.franchises(slug),
  product_type public.product_type not null default 'single_card',
  name_en text not null,
  name_ar text not null,
  name_ckb text not null,
  description_en text not null default '',
  description_ar text not null default '',
  description_ckb text not null default '',
  set_name text not null,
  card_number text,
  rarity public.rarity,              -- only meaningful for single_card
  price numeric(10, 2) not null check (price >= 0),
  condition text not null default 'New',
  grade text,
  image text not null,
  images text[] not null default '{}',
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  unique (franchise_slug, slug)
);

create index if not exists products_franchise_idx on public.products (franchise_slug);
create index if not exists products_rarity_idx on public.products (rarity);
create index if not exists products_set_idx on public.products (set_name);
create index if not exists products_type_idx on public.products (product_type);

alter table public.products enable row level security;
create policy "products are publicly readable"
  on public.products for select
  using (true);
create policy "admins manage products"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── Orders (cash-on-delivery reservation flow — no online payment yet) ────
create type public.order_status as enum ('requested', 'confirmed', 'delivered', 'cancelled');

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),   -- null for guest checkout
  status public.order_status not null default 'requested',
  payment_method text not null default 'cash',
  full_name text not null,
  phone text not null,
  city text not null,
  address text not null,
  notes text,
  subtotal numeric(10, 2) not null,
  total numeric(10, 2) not null,
  currency text not null default 'IQD',
  created_at timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);

alter table public.orders enable row level security;
create policy "users read their own orders"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());
create policy "anyone can place an order"
  on public.orders for insert
  with check (auth.uid() = user_id or user_id is null);
create policy "admins update orders"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

-- ── Order items ───────────────────────────────────────────────────────────
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  product_name text not null,   -- snapshot at time of order
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null
);

alter table public.order_items enable row level security;
create policy "read order items for visible orders"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );
create policy "create order items for own order"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or o.user_id is null)
    )
  );

-- ── Newsletter signups (footer form) ───────────────────────────────────────
create table if not exists public.newsletter_signups (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.newsletter_signups enable row level security;
create policy "anyone can subscribe"
  on public.newsletter_signups for insert
  with check (true);

-- ── Storage: product images ────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'product-images');
create policy "admins upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "admins update product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin());
create policy "admins delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());
