# KurdishTCG — Admin dashboard

Internal admin for the storefront in `../frontend`. Same Supabase project; what an admin
may do is enforced by Row Level Security (`public.is_admin()`), not by this UI.

## Run

```bash
npm install
cp .env.example .env.local   # same URL + publishable key as ../frontend/.env.local
npm run dev                  # http://localhost:3001
```

Sign in with an account whose `profiles.role` is `admin` (the test one is in
`../frontend/README.md`). Never put the Supabase service-role key in this app.

## What's here

- **Overview** — new requests, in-progress and delivered totals, low stock.
- **Orders** — filter by status, search by name / phone / id; order page has the customer,
  items, Call / WhatsApp buttons and status actions
  (New request → Confirmed → Out for delivery → Delivered, or Cancelled).
- **Products** — search/filter, inline stock editing, create/edit with English / Arabic /
  Kurdish text and image upload (`product-images` bucket).
- **Franchises** — create/edit; a new franchise shows up on the storefront immediately.
- **Settings** — currency, WhatsApp number, contact email.

## Database changes it needs

Run `../supabase/migrations/0001_admin_dashboard.sql` once in the Supabase SQL editor.
Without it, saving **Settings** and moving an order to **Out for delivery** will fail
(the dashboard says so instead of pretending it worked).
