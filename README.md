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

More: [`context.md`](context.md) (product/tech decisions) · [`TODO.md`](TODO.md) (status).
