# Project Context: TCG Marketplace

## What this project is

An e-commerce website for selling trading card game (TCG) collections across multiple
franchises:

- Riftbound (League of Legends TCG)
- Naruto (Kayou)
- Disney Lorcana
- Avatar: The Last Airbender
- SpongeBob
- Zootopia
- (more franchises are added through the admin dashboard, not code — franchises
  are rows in the `franchises` table)

Target scale for the first real launch: ~1,000 customers. Current phase: **build and test**,
not production.

## Monorepo structure

Two apps live in one repo, directly under the repo root (no `apps/` wrapper):

```
/frontend        -> customer-facing storefront (Next.js, public, port 3000)
/dashboard       -> admin: orders, products, franchises, settings (Next.js, port 3001)
/packages/types  -> shared TypeScript types (`@tcg/types`: Product, Franchise, Order, …)
/supabase        -> SQL migrations applied on top of frontend/src/lib/supabase/schema.sql
/TODO.md         -> what's done / open, one section per area
```

- `frontend`: what customers see and buy from.
- `dashboard`: internal tooling for managing products, inventory, and orders. Talks
  directly to the same Supabase project (access enforced by RLS `is_admin()`). Not
  customer-facing.
- Shared types live in `packages/types` so both apps agree on the shape of a Product,
  Order, etc.
- Market: Iraq only (cash on delivery, no global shipping).

## Tech stack decisions (and why)

- **Frontend framework:** Next.js (App Router). Chosen for server-side rendering / ISR,
  which matters for SEO on product pages, and for Server Components to avoid client-side
  data waterfalls.
- **Backend/database:** Supabase (Postgres + Auth + Storage + Row Level Security). At
  ~1,000 customers this is comfortably within Supabase's free/Pro tier limits. Supabase
  provides the database, auth, and file storage — it does NOT provide commerce logic
  (cart, checkout, inventory decrement) out of the box; that's built on top.
- **Styling/components:** Tailwind CSS + shadcn/ui, themed via a shared design token set
  so each franchise can have distinct branding inside one consistent shell.
- **Payments:** Cash on delivery only, for this phase and the foreseeable one after
  it. Checkout creates a reservation (`orders` row, status `requested`); the shop
  calls the customer to confirm, then marks it `confirmed` → `delivered` from the
  admin dashboard. No Stripe/online payment integration exists or is currently
  planned — revisit only if the business actually needs online prepayment later.

## Data strategy for testing

Real data, manually curated — no Faker, no placeholder image services, no
pokemontcg.io. Product photography (sealed boxes, packs, decks, and individual
cards) was sourced from real listings for each franchise, archived at
`assets/source-images/`, then cleaned up and uploaded to Supabase Storage. Every
franchise and product record carries English, Arabic and Sorani Kurdish text
written by hand (not machine-translated at request time), matching the site's
three locales.

## Build order

1. Scaffold the repo (`frontend`, `dashboard`, shared `packages/`)
2. Build `apps/frontend` UI against a mock data layer (pokemontcg.io + Faker) — see
   `frontend-ui-prompt.md` for the detailed UI build prompt
3. Set up Supabase project + schema (products, franchises, orders, order_items, users)
4. Write and run the seed script
5. Swap the frontend's mock data layer for real Supabase queries
6. Build `dashboard` admin tooling against the same Supabase project
7. Add Stripe checkout (test mode)
8. Add auth-gated account/order pages

## Non-goals for this phase

- No online payment processing — cash on delivery only (see Tech stack decisions)
- No production deployment yet
- No multi-admin roles — one `admin` role, no permission tiers
