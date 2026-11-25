# KurdishTCG

Trading-card-game shop for Iraq — Riftbound, Naruto, Lorcana, Avatar, SpongeBob, Zootopia.
Cash on delivery; the shop confirms every order by phone.

| Folder | What it is | Dev URL |
| --- | --- | --- |
| [`frontend/`](frontend) | Customer storefront (en / ar / ckb) | http://localhost:3000 |
| [`dashboard/`](dashboard) | Admin: orders, products, franchises, settings | http://localhost:3001 |
| [`packages/types/`](packages/types) | Shared TypeScript types (`@tcg/types`) | — |
| [`supabase/`](supabase) | SQL migrations for the shared Supabase project | — |

Both apps use the same Supabase project. Each has its own `.env.local` (see `.env.example`
in `dashboard/`; the storefront uses the same two variables).

```bash
cd frontend  && npm install && npm run dev   # storefront
cd dashboard && npm install && npm run dev   # admin
```

## Customer marketplace (`/sell`)

Any signed-in customer (Google or email) can list their own cards at `/sell`:

1. They save a WhatsApp number, then upload photos + price + quantity. The listing is an
   ordinary `products` row with `seller_id` set, so it shows in the shop right away.
2. When someone orders it, the seller sees the order on `/sell → Orders` with the buyer's
   name, phone and address and a one-tap WhatsApp chat link. The buyer's order page shows a
   "Message seller on WhatsApp" button.
3. The seller presses **I received the money**, the buyer presses **I received my order**.
   Once both have confirmed and the listing's quantity is 0, the listing and its photos
   (R2 `listings/<user-id>/…`) are deleted automatically. Past orders keep a snapshot.

Needs `supabase/migrations/0012_seller_marketplace.sql` applied. Optional automatic WhatsApp
messages to sellers: set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANG` (see `frontend/src/lib/whatsapp.ts`).

## Deploying to Vercel

Two separate Vercel projects from this one repo (there is no root `package.json`):

| Project | Root Directory | Env vars |
| --- | --- | --- |
| Storefront | `frontend` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Admin | `dashboard` | same two |

In each project's **Settings → General → Root Directory**, keep **"Include source files
outside of the Root Directory in the Build Step"** enabled — both apps import
`../packages/types`. Framework preset: Next.js; build/install commands are the defaults.

More: [`context.md`](context.md) (product/tech decisions) · [`TODO.md`](TODO.md) (status).
