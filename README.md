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

## Deploying to Vercel

Two separate Vercel projects from this one repo (there is no root `package.json`):

| Project | Root Directory | Env vars |
| --- | --- | --- |
| Storefront | `frontend` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Admin | `dashboard` | same two |

In each project's **Settings → General → Root Directory**, keep **"Include source files
outside of the Root Directory in the Build Step"** enabled — both apps import
`../packages/types`. Framework preset: Next.js; build/install commands are the defaults.

## Community marketplace (`/market`, `/sell`)

Signed-in customers list singles, packs or bundles (front + back photo per card) and
buyers order them cash-on-delivery, picking their city on the governorate map.
Schema: [`supabase/migrations/0008_marketplace.sql`](supabase/migrations/0008_marketplace.sql).

Sellers are notified of each order on WhatsApp, or Viber (their choice, or as fallback
when WhatsApp can't reach them). Without these env vars nothing is sent automatically —
orders still appear under Sell → Orders, and buyers get one-tap WhatsApp/Viber buttons.

| Var (storefront, server-only) | Purpose |
| --- | --- |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business Cloud API sender |
| `WHATSAPP_ORDER_TEMPLATE` (default `new_market_order`), `WHATSAPP_TEMPLATE_LANG` (default `ar`) | Approved template with 8 body variables: title, qty, total, buyer name, buyer phone, city, address, link |
| `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | Webhook `/api/whatsapp/webhook` — falls back to Viber on undeliverable |
| `INFOBIP_BASE_URL`, `INFOBIP_API_KEY`, `INFOBIP_VIBER_SENDER` | Viber Business Messages via Infobip |

More: [`context.md`](context.md) (product/tech decisions) · [`TODO.md`](TODO.md) (status).
