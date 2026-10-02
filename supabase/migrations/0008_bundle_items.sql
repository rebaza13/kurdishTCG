-- "Also included" list for bundle products: sell one card (or box) and show the
-- extra cards that come with it. A bundle stays ONE product with one price and
-- one stock count — this column is display-only.
--
-- Shape: [{ "name": "Monkey D. Luffy", "image": "https://…" | null }, …]
alter table public.products
  add column if not exists bundle_items jsonb not null default '[]'::jsonb;

alter table public.products
  drop constraint if exists products_bundle_items_is_array;
alter table public.products
  add constraint products_bundle_items_is_array
  check (jsonb_typeof(bundle_items) = 'array' and jsonb_array_length(bundle_items) <= 24);
