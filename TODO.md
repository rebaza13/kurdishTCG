# KurdishTCG — TODO

One section per area so work doesn't get mixed up. `[x]` done · `[ ]` open · `[?]` needs a decision or something only the owner can do.
Market: **Iraq only** (cash on delivery; no global shipping/payments).

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
- [x] Checkout: **Cash on delivery** default, **FIB / bank = "Coming soon"** (disabled) — all 3 languages
- [x] Checkout: phone mandatory + Iraqi mobile validation (07xx / +964 7xx), normalized to `07xxxxxxxxx`
- [x] Order confirmation shows a reference (`#ABCD1234`) the customer can quote on the phone
- [x] Account: sign-up tells the user to confirm their email; order status `shipped` translated
- [ ] SECURITY: checkout trusts client-sent prices/totals → move to a DB function (`place_order`) that prices from `products`
- [ ] Checkout does not check stock (can order more than exists / sold-out items already in cart)
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

- [?] Run `supabase/migrations/0001_admin_dashboard.sql` — settings admin-update policy + `shipped` order status
- [?] Run `supabase/migrations/0002_iqd_only.sql` — converts existing USD prices to IQD once (**edit the exchange rate in it first**, default 1500). Until then the storefront shows old USD numbers as IQD (e.g. "4 IQD")
- [ ] `place_order()` RPC: server-side pricing + stock check + atomic insert (+ phone check)
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
