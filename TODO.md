# KurdishTCG — TODO

One section per area so work doesn't get mixed up. `[x]` done · `[ ]` open · `[?]` needs a decision or something only the owner can do.
Market: **Iraq only** (cash on delivery, or online with FIB — no global shipping/payments).

---

## 1. Repo structure
_Goal: repo root = the project. `frontend/` and `dashboard/` sit directly under it — no `apps/` wrapper._

- [x] `apps/frontend` → `frontend/` (git root is `D:\kurdishTCG`)
- [x] `context.md` moved to repo root; root `README.md` added; docs updated to the new paths
- [x] `packages/types` recreated (`@tcg/types`) — it was imported everywhere but never committed, so a fresh clone did not typecheck
- [x] `turbopack.root` set in both `next.config.ts` so the shared package resolves
- [x] Deleted the empty leftover `apps/` folder
- [x] New layout committed and pushed to `origin/main`
- [x] Removed test-account credentials from `frontend/README.md` (repo is public)
- [?] **Rotate/delete the `admin@kurdishtcg.test` and `customer@kurdishtcg.test` accounts in Supabase** — their passwords are in git history

## 2. Storefront (`frontend/`)
_Customer site: browse → cart → checkout → account. Next.js 16, next-intl (en / ar / ckb)._

- [x] Typecheck + lint clean (was 16 type errors)
- [x] New franchises created from the dashboard now show up (removed hard-coded `FRANCHISE_ORDER` filtering)
- [x] Checkout: **Cash on delivery** or **Pay with FIB** (QR / FIB app, stage credentials) — all 3 languages
- [x] Checkout: phone mandatory + Iraqi mobile validation (07xx / +964 7xx), normalized to `07xxxxxxxxx`
- [x] Order confirmation shows a reference (`#ABCD1234`) the customer can quote on the phone
- [x] Account: sign-up tells the user to confirm their email; order status `shipped` translated
- [x] SECURITY: checkout moved server-side (`POST /api/checkout`) — prices and checks stock from `products` itself, not from whatever the browser sends. Direct client inserts into `orders`/`order_items` are now blocked by RLS (see `supabase/migrations/0003_fib_payments.sql`)
- [x] Checkout now checks stock (rejects with `out_of_stock` instead of silently overselling)
- [x] FIB payment gateway (see new "7. FIB payment gateway" section below)
- [ ] City = governorate dropdown (18) instead of free text
- [x] Currency: **IQD only**, whole dinars (`25,000 IQD` / `٢٥٬٠٠٠ د.ع`) — storefront, checkout and dashboard

## 3. Dashboard (`dashboard/`)
_Admin site (port 3001). Same Supabase project; access enforced by RLS `is_admin()`. English UI; content forms are en/ar/ckb._

- [x] Built: login, overview, orders (list + detail + status actions), products (inline stock, 3-language form, image upload), franchises, settings
- [x] Typecheck, lint, production build all pass
- [x] `dashboard/.env.local` created from the frontend's
- [?] **Browser test with a real admin login** — owner must sign in once at http://localhost:3001 (assistant can't type passwords)
- [ ] Test after login: orders list/detail/status change, product create/edit/delete/upload, franchise create, settings save
- [ ] Deploy (Vercel) so it works from a phone

## 4. Database (Supabase)
_No Supabase MCP connected in the session, so SQL has to be applied by hand (SQL editor) or via MCP._

- [x] Ran `supabase/migrations/0001_admin_dashboard.sql` — settings admin-update policy + `shipped` order status (pushed via Supabase Management API, verified)
- [x] Ran `supabase/migrations/0002_iqd_only.sql` — converted existing USD prices to IQD at rate 1500 (verified: `settings.currency = 'IQD'`, product prices updated)
- [x] Ran `supabase/migrations/0003_fib_payments.sql` — `payment_status` enum + FIB columns added to `orders`, client-insert RLS policies on `orders`/`order_items` confirmed dropped
- [x] Server-side pricing + stock check + atomic insert — done as a Next.js route handler (`frontend/src/app/api/checkout`) rather than a `place_order()` RPC, since the route already needed the service-role key for FIB
- [ ] Decrement stock when an order is confirmed (stock is never reduced automatically today)

## 5. Order notifications ("I'm away, laptop off")
_Must run online (Supabase + Vercel), not on the laptop._

- [?] Decide channel — recommendation: **Telegram bot** (instant phone push, free, widely used in Iraq); email as backup
- [ ] Create bot with @BotFather → bot token + your chat id
- [ ] On new order → Telegram message: customer, phone, city, items, total, link to `/orders/<id>` in the dashboard
- [ ] Deploy dashboard (Vercel) — the link in the message must open from a phone

## 6. Order lifecycle
_New request → Confirmed → Out for delivery → Delivered, or Cancelled. Cash on delivery; you phone the customer to confirm._

- [x] Dashboard drives all transitions (`shipped` needs migration 0001)
- [x] Customer account page shows the status in their language

## 7. FIB payment gateway
_"Pay with FIB": QR / deep-link payment via First Iraqi Bank, alongside cash on delivery. Stage (test)
credentials from FIB's 2026-09-09 integration email — same email has the test FIB Personal/Business
apps (Android only) and account logins for actually trying a payment end to end._

- [x] `frontend/src/lib/fib.ts` — server-only FIB client (uses the `fibpay` npm package FIB's own email
  recommended; verified directly against the stage API — auth, create, status, cancel all confirmed
  working with the given test credentials before writing any app code)
- [x] `POST /api/checkout` — creates the order, and for `paymentMethod: "fib"` also creates the FIB
  payment (QR + FIB-app deep links) and stores `fib_payment_id` on the order
- [x] `POST /api/fib/webhook` — FIB's status-change callback. Never trusts the callback body's status;
  re-fetches it from FIB with our own credentials before writing to the DB (a spoofed POST to this
  public URL can't mark an order paid)
- [x] `GET /api/fib/status/[paymentId]` — polling fallback the account order page uses, per FIB's own
  best-practice doc (wait 15s after creating a payment, then poll every 5s). This is what actually
  confirms payment in local dev, since FIB can't reach a `localhost` webhook
- [x] `POST /api/fib/retry` — cancels a stale/declined payment and creates a fresh one for the same
  order (the FIB API has no "reissue the QR" endpoint, so retry = cancel + recreate)
- [x] `POST /api/fib/admin/refund` and `/api/fib/admin/cancel` — called cross-origin by the dashboard
  (CORS-restricted to `NEXT_PUBLIC_DASHBOARD_URL`), admin-only (checked via the caller's Supabase
  session + `profiles.role`)
- [x] Checkout page: "Pay with FIB" requires sign-in — a guest who picks it sees an inline
  "Continue with Google" prompt (or a link to sign in by email) before they can submit
- [x] QR/status dialog (`frontend/src/components/fib-payment-dialog.tsx`) — shared by checkout and the
  account order page, shows the QR + FIB-app links, counts down to expiry, polls, and offers retry on
  decline/expiry
- [x] Account: `/[locale]/account/orders/[id]` — per-order page with payment status, FIB reference,
  paid-by name once paid, decline reason if declined, and a "Pay now" / "Try again" button
- [x] Dashboard: orders list + detail show payment status; detail page has Refund (paid, within 24h —
  enforced by FIB) and Cancel-FIB-payment (pending) actions; cancelling an order with a pending FIB
  payment also best-effort cancels that payment at FIB
- [x] Ran `supabase/migrations/0003_fib_payments.sql` (see "4. Database" above)
- [x] Added the real `SUPABASE_SERVICE_ROLE_KEY` to `frontend/.env.local`
- [?] **Enable Google as a Supabase Auth provider** (Authentication → Providers → Google, in the
  Supabase dashboard) — the "Continue with Google" button already exists in the UI but errors
  (`googleNotConfigured`) until this is turned on
- [x] Verified live end-to-end against the running dev server + real Supabase project: `POST
  /api/checkout` (cash) writes a real order; `POST /api/checkout` (fib, signed in) creates a real FIB
  stage payment (QR + readable code `SXN7-JL8Q-PGDH` + app links) and stores it on the order; `GET
  /api/fib/status/[paymentId]` re-polls FIB and correctly reports `UNPAID` → `pending`. Test
  order rows and the throwaway test auth user were deleted afterward — DB is clean
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the real deployed URL once deployed — FIB's webhook can only reach
  a public HTTPS URL, so on `localhost` payment confirmation relies entirely on the polling fallback
  above (which does work, just isn't instant)
- [ ] Try a real test payment: install the FIB Personal Staging app (Android only, from the integration
  email's Firebase link) and pay a stage order with the test personal account (`7701234567` /
  `Personal@123`)
- [ ] Swap `FIB_CLIENT_ID` / `FIB_CLIENT_SECRET` for production credentials and set
  `FIB_ENVIRONMENT=production` once FIB approves the account for real payments (contact
  integration@fib.iq per their docs)
