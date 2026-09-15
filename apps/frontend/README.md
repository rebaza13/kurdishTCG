# KurdishTCG — Storefront

Customer-facing storefront for the KurdishTCG marketplace (Next.js App Router).
Sells real, photographed sealed product and single cards across six franchises:
Riftbound, Naruto, Disney Lorcana, Avatar: The Last Airbender, SpongeBob and
Zootopia. See `../../.claude/CLAUDE.md` and `../../context.md` for full project
context, and `../../.claude/TODO-frontend.md` for current status.

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000> — it redirects to `/en`, `/ar` or `/ckb` depending on
your browser's language.

`.env.local` already has the public Supabase URL and anon key checked out for local
dev (see `.env.example` for the shape). Never put the service role key in this app.

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

## Test accounts

```
admin@kurdishtcg.test    / TestAdmin123!     (role: admin)
customer@kurdishtcg.test / TestCustomer123!  (role: customer)
```
