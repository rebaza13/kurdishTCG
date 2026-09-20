# KurdishTCG — Storefront

Customer-facing storefront for the KurdishTCG marketplace (Next.js App Router).
Sells real, photographed sealed product and single cards across six franchises:
Riftbound, Naruto, Disney Lorcana, Avatar: The Last Airbender, SpongeBob and
Zootopia. See `../context.md` for full project context and `../TODO.md` for
current status. The admin site lives in `../dashboard`.

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000> — it redirects to `/en`, `/ar` or `/ckb` depending on
your browser's language.

Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (same shape as `../dashboard/.env.example`).
Never put the service role key in this app.

## Structure

- `src/app/[locale]/...` — routed pages (home, franchises, listing, product detail,
  cart, checkout, account, search, sell-stub)
- `src/lib/data/` — the only place that talks to Supabase for product/franchise
  reads; every page/component goes through `getFranchises`/`getProducts`/etc. here
- `src/lib/supabase/schema.sql` — source of truth for the database schema (applied
  via the Supabase MCP server)
- `src/lib/cart-store.ts` — client-only Zustand cart, persisted to localStorage
- `messages/{en,ar,ckb}.json` — all UI copy; add new keys to all three when adding
  a component, product/franchise text lives in the database instead
- `src/app/globals.css` — the two design systems (light "Storefront", dark "Neon
  Vault") as one semantic token set

## Accounts

Create a customer account from `/account`. To make someone an admin, run
`../supabase/make-admin.sql` against the Supabase project. Never commit credentials.
