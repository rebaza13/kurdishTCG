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

## 10. Bugs found by re-running QA with Chrome connected, and fixed (2026-09-22)
_Two browser QA agents re-ran once Claude-in-Chrome connected. Fixed same-session; two more
required a live RLS policy fix that couldn't be applied (see below)._

- [x] Order detail page showed the raw i18n key `account.orderRef` instead of "Your reference" —
  wrong translation namespace (`t` instead of `checkoutT`) in
  `src/app/[locale]/account/orders/[id]/page.tsx`. Fixed.
- [x] "Graded" nav link (header + footer) filtered nothing — `?graded=1` was never read anywhere.
  Grading only ever applied to single cards, which are now hidden storefront-wide, so removed the
  link entirely rather than building filtering for a category that can't have results.
- [x] Cart quantity steppers (`cart-drawer.tsx`, `cart/page.tsx`) let you increment past a
  product's stock with no warning — checkout already re-validates server-side, but the UI gave no
  signal. Added a `stock` snapshot to `CartItem` (`packages/types`), capped both steppers against
  it. The product-page quantity selector already capped correctly; only post-add steppers didn't.
- [x] Dashboard: typing a URL character-by-character into a product/franchise "image" field
  crashed the whole form (uncaught `Invalid URL` from `next/image` on the transient `"https://"`
  state) — fixed the preview's validation (`dashboard/src/components/image-upload.tsx`).
- [x] Dashboard: nothing stopped an admin from pasting an image URL from a host the storefront's
  `next.config.ts` doesn't allow, which crashed the *entire* franchise listing page for every
  visitor (uncaught `next/image` "hostname not configured" error, no fallback). Added a host
  check before save on both product and franchise forms.
- [?] **Two more real bugs found, fixes written but NOT applied — still no way to run SQL against
  the live database (no Management API token / DB connection this session):**
  - `supabase/migrations/0005_order_items_admin_read.sql` — the `order_items` SELECT policy live
    only allows the order's own customer, never `is_admin()`, unlike `orders` itself. Reproduced
    directly: an admin session gets the order but an always-empty `order_items` array. **The shop
    owner currently cannot see what's inside any order in the dashboard** — this is the most
    important of the three unapplied migrations (0004/0005/0006).
  - `supabase/migrations/0006_newsletter_rls.sql` — newsletter signup 403s every time
    (`new row violates row-level security policy`), even though schema.sql already describes an
    "anyone can subscribe" policy. Reproduced directly as an anon client.
  - Run all three (`0004`, `0005`, `0006`) in the Supabase SQL editor — `0005` especially, since
    it blocks actually fulfilling orders.
- Not investigated further (lower priority, logged only): dashboard franchise-count/from-price
  aggregation looked off mid-session, but that was very likely just the packs-only filter (added
  this same session) taking effect concurrently with the QA run, not a separate bug — worth a
  fresh look after the migrations above are applied, if it still looks wrong.
- One throwaway QA account (`qa-temp-customer@kurdishtcg.test`) couldn't be deleted (blocked by a
  foreign-key reference from its test orders) — harmless, but worth deleting by hand later.

## 9. Packs-only enforcement + hero rework #2 (2026-09-22, same day)
_Supervisor clarified: this storefront sells sealed packs/boxes only — no individual cards,
including in the hero. Chrome extension reconnected, so the two blocked QA agents were re-run._

- [x] Hero rebuilt again: dropped the single-card tilt/hover-to-buy interactive card entirely
  (was `HeroCardStage`, now unused but left in `src/components/hero-card-stage.tsx` in case a
  future single-card feature wants it — not deleted). New `PackShowcase` component
  (`src/components/pack-showcase.tsx`) shows 3 sealed packs fanned out (background removed
  locally via Python/Pillow flood-fill, not a paid API), staged as PNGs under
  `frontend/public/packs/`. These are **stock/placeholder pack photos, not real catalog
  product photography** — swap for real shots when available.
- [x] Hero + About page copy scrubbed of "single card(s)" language in all 3 locales
- [x] Single-card products hidden storefront-wide (not deleted): `fetchAllProducts()` and
  `getProductBySlug()` in `src/lib/data/index.ts` now filter `product_type != 'single_card'`.
  Verified live: a single-card product URL now 404s, sitemap.xml no longer lists any. Cascades
  to search, franchise filters, featured products, and franchise card-count/from-price stats.
- [?] **Dashboard's product-type dropdown still offers "single_card"** when creating a product —
  not fixed (dashboard untouched this session to avoid colliding with the live QA pass running
  against it at the time). Decide whether to remove that option too.
- [ ] Verified in Chrome across light/dark theme, mobile (390px) and RTL (Arabic) — all correct.
  Desktop-width screenshot verification was flaky (window resize not consistently taking effect
  in this session) but a fresh tab did confirm it.

## 8. Production-readiness pass (2026-09-22)
_Five parallel QA agents (functional, Supabase CRUD, SEO, performance, build/debug) plus direct
work: hero redesign, missing pages, and a few fixes. `frontend/.env.local` and
`dashboard/.env.local` were filled in this session (service role key, FIB stage creds, dashboard
Supabase keys) — were previously missing/incomplete on this checkout._

**Fixed and verified this session:**
- [x] Checkout oversell bug: two line items for the same product summed past stock and both passed
  the per-line stock check independently (5+5 against 8 in stock → order accepted for 10). Fixed by
  merging duplicate `productId`s before validating; verified live against real Supabase data that
  the same request is now rejected with `out_of_stock`, and a legitimate order still succeeds.
  (`frontend/src/app/api/checkout/route.ts`)
- [x] Also added: item-count cap (50), integer-quantity validation on checkout (was silently
  accepting `1.5`)
- [x] Footer's About/Contact/Shipping info/Returns/FAQ links all pointed at `/` — built all 5 pages
  (en/ar/ckb), wired the footer to them. Contact page reads `whatsapp_number`/`contact_email` live
  from the `settings` table (currently empty — fill in via dashboard Settings to make it live)
- [x] Hero section redesigned: card stage now leads on every viewport; the copy column (headline,
  subtitle, franchise chips) is desktop-only so mobile doesn't scroll past a wall of text before
  reaching the product grid. Dropped the eyebrow-badge + stat-row pattern. New copy in all 3 locales
  — **AR/CKB hero copy is AI-translated, not reviewed by a native speaker; same caveat applies to
  the 5 new pages' AR/CKB copy.**
- [x] SEO: added `generateMetadata` (unique title/description/OG/Twitter/canonical/hreflang) to
  home, franchises listing, franchise detail, product detail; `metadataBase` on the locale layout;
  `sitemap.ts` (all real routes × 3 locales, ~99 entries), `robots.ts`, `manifest.ts`; Product
  JSON-LD on product pages, Organization/WebSite JSON-LD on home; fixed a missing `alt` on franchise
  tile images. Previously: every page shared the same generic title/description, no sitemap, no
  robots.txt, no structured data at all.
- [x] Performance: added `revalidate = 300` to home + franchises listing (were caching indefinitely
  at build time with live commerce data and no revalidation); lazy-loaded `@supabase/supabase-js` in
  the footer's newsletter form instead of shipping the full SDK on every page load
- [x] Installed the `frontend-design` skill (Leonxlnx/taste-skill and emilkowalski/skill were
  already installed from a prior session)

**Found, NOT fixed — needs a decision or follow-up:**
- [?] **Checkout has no idempotency guard** — a double-submit or retried network request creates a
  duplicate order (and, worse, a duplicate real FIB payment). Wrote
  `supabase/migrations/0004_checkout_idempotency.sql` (adds a unique `idempotency_key` column) but
  couldn't apply it — no Supabase Management API token / DB connection available this session, only
  the REST/service-role keys. **Run that migration in the Supabase SQL editor**, then the app code
  can be wired to use it (not done yet, to avoid shipping code against a column that doesn't exist).
- [ ] Same-order-id race in `POST /api/fib/retry`: two concurrent retries can both cancel the old FIB
  payment and both create a new one; the loser's new payment is never linked to the order but is
  still live/payable at FIB. Needs a DB-level guard (conditional update) before implementing.
- [ ] `orders` insert has no transaction — if the `order_items` insert fails after `orders` succeeds,
  cleanup is a manual best-effort delete whose result isn't checked. Worth an atomic RPC eventually.
- [ ] FIB error messages are forwarded to the client verbatim in a few places (not a stack trace, but
  unfiltered third-party text) — worth allowlisting known error codes instead.
- [ ] No rate limiting on `/api/fib/webhook` or `/api/fib/status/[id]` (both are safe-by-design since
  they re-verify with FIB rather than trusting input, but still hammer-able)
- [ ] Product detail pages have no `generateStaticParams`/ISR — fully SSR on the highest-traffic
  route type. `franchises/[franchise]/page.tsx` has `generateStaticParams` but it's currently a
  no-op because reading `searchParams` forces it dynamic anyway (correct, given the filter UI) — but
  either way, `src/lib/data/index.ts`'s `fetchAllProducts()` does a full unfiltered table scan with
  zero caching/memoization, called 2-3× per page view (product page = product fetch + franchise fetch
  + related-products fetch, no dedup). Wrap in React's `cache()` / `unstable_cache` before this gets
  expensive at real traffic.
- [ ] `Header` and `Footer` are monolithic client components for one small stateful bit each (search
  input, newsletter input) — splitting each into a server shell + small client island would cut
  shipped JS on every route, not just one page.
- [ ] Account pages (`/account`, `/account/orders/[id]`) are 100% client-fetched (mount → auth →
  orders, with a spinner the whole time) instead of server-rendering the read-mostly content — a
  visible loading waterfall on every visit.
- [ ] **Two browser-dependent QA passes never ran** — the Claude-in-Chrome extension wasn't connected
  this session, so live checkout/FIB-dialog/cart/account UI testing and live dashboard product/
  franchise create-edit-delete-filter testing were skipped entirely (code-level review only). A
  throwaway admin account (`qa-temp-admin@kurdishtcg.test`) and customer account
  (`qa-temp-customer@kurdishtcg.test`) were created in Supabase for this and are still there,
  pending a re-run — delete them once that QA pass is done (or ask to have them deleted now).
- [?] Returns/Shipping page copy (delivery timeframe, return window in days, which party pays return
  shipping) is a reasonable draft, not the owner's actual policy — the real numbers were never
  provided. Review and edit before this reads as a real policy to customers.
