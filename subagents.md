# Subagent reports — 2026-09-22 production-readiness pass

Full, unedited reports from the QA/audit/implementation subagents run during the
2026-09-22 production-readiness session. Summaries of these are in `TODO.md` §8-10;
this file has the complete original text for reference.

---

## 1. Storefront functional QA (first pass — blocked, Chrome not connected)

**QA Pass Blocked — Browser Extension Not Connected**

I could not complete this task as specified. `list_connected_browsers` returned an empty list and `switch_browser` reported "No other browsers available to switch to" — there is no Chrome instance with the Claude extension connected to this session. Per my instructions I'm not to keep retrying a failing tool path, and I have no way to prompt the user interactively from this subagent context to get them to connect one. None of the click-through testing (items 1–9, 11, 12: home page, franchise/filter, PDP, cart, both checkout flows, account pages, search, /sell, mobile viewport, RTL locales, console errors) could be performed live.

**Action needed:** have the user open Chrome with the Claude-in-Chrome extension installed and signed into the same claude.ai account, then re-run this subagent.

### What I could still verify statically (code read only, NOT live-tested — flag for confirmation)

**Item 10 — Footer links: your suspicion is confirmed exactly**, per `D:\Projects\kurdishTCG\frontend\src\components\footer.tsx`:
- Lines 94–114: **About** (`t("about")`), **Contact**, **Shipping Info**, **Returns**, and **FAQ** all use `<Link href="/">` — literally the home page, not real destinations. All five are dead/placeholder links.
- Shop-column links (Franchises, New Arrivals `/franchises?sort=newest`, Graded `/franchises?graded=1`, Sell to Us `/sell`, Cart, Account) point to real routes and look legitimate — worth live-verifying the query-param filters actually apply once browser access is restored.
- Newsletter signup form (lines 38–48) does a real Supabase `upsert` into `newsletter_signups` (onConflict email, ignoreDuplicates) — structurally sound, not tested live.

**Item 5 — Phone validation**, per `D:\Projects\kurdishTCG\frontend\src\lib\phone.ts`: regex `^(?:(?:\+|00)964|0)?(7\d{9})$` accepts `07XXXXXXXXX` / `+9647XXXXXXXXX` / `009647XXXXXXXXX`, normalizes to local `07XXXXXXXXX`. Comment notes it's also enforced server-side in the checkout route (not just client-side), which is good practice — but I did not confirm the server-side call site or exercise it with real/bad input.

**Route existence sanity check** (no content/behavior verified): `/search`, `/sell`, `/franchises`, `/franchises/[franchise]/[slug]`, `/cart`, `/checkout`, `/account`, `/account/orders`, `/account/orders/[id]`, and the FIB API routes (`/api/fib/status`, `/api/fib/webhook`, `/api/fib/retry`, `/api/fib/admin/cancel`, `/api/fib/admin/refund`) all exist as expected in `src/app/[locale]/...` and `src/app/api/...`.

No order was created (checkout was never exercised), so there is no order reference code to report.

**Recommendation:** re-invoke this QA subagent once a Chrome browser with the extension is connected — the bulk of this checklist (cart math, add-to-cart, FIB QR/dialog gating, order confirmation, account order detail, RTL layout, mobile viewport, console/hydration errors) genuinely requires live interaction and was not attempted here to avoid fabricating results.

---

## 2. Supabase CRUD/filtering QA via dashboard (first pass — blocked, Chrome not connected)

cleanup status: all clear — no test data was created; the task could not proceed past setup.

**BLOCKER: claude-in-chrome browser extension is not connected.** `list_connected_browsers` returns an empty list (checked twice), and `tabs_context_mcp` fails with "Browser extension is not connected." I have no way to install the extension or restart Chrome myself, and this task requires live UI-driven testing (explicitly not a code read), so I cannot perform any of the 8 requested steps (login, product CRUD, franchise CRUD, storefront cross-checks, orders, settings, stock-decrement verification).

What I did complete: read `D:\Projects\kurdishTCG\TODO.md` and `D:\Projects\kurdishTCG\context.md` for background. Relevant pre-existing notes from TODO.md that bear directly on this QA pass (not yet verified live):
- Section 3 (Dashboard): "`[?]` Browser test with a real admin login — owner must sign in once"; "`[ ]` Test after login: orders list/detail/status change, product create/edit/delete/upload, franchise create, settings save" — i.e., this exact QA pass has never been done before.
- Section 4 (Database): "`[ ]` Decrement stock when an order is confirmed (stock is never reduced automatically today)" — this is the item task step 8 asks me to re-confirm; I was not able to verify it live.

No files were read, edited, or created outside this report; no dashboard/Supabase state was touched.

**Action needed:** please ensure the Claude-in-Chrome extension is installed and connected (chrome://extensions, confirm it's enabled and signed into the same claude.ai account), then re-invoke this QA pass — I'll pick up all 8 steps from scratch at that point.

---

## 3. SEO audit of storefront

**Method:** Read `src/` source, cross-checked against `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` and `.../03-file-conventions/01-metadata/{sitemap,robots}.md` (this Next 16.3.5 build's metadata API matches stock Next.js — no custom breaking changes found there). Verified via raw `curl` against the running dev server (zero JS execution, so this proves server-rendered HTML, not hydration artifacts) across `/en`, `/en/franchises`, `/en/franchises/avatar`, `/en/franchises/avatar/mtg-prerelease-box`, and `/ar`, `/ckb` equivalents. The claude-in-chrome extension wasn't connected this session, so `curl` was the verification method — sufficient for SSR confirmation since it bypasses JS entirely.

### Blockers

1. **No per-route metadata anywhere except the root locale layout.** Only `src/app/[locale]/layout.tsx` has a `generateMetadata` (title template + generic tagline description). None of `src/app/[locale]/page.tsx`, `src/app/[locale]/franchises/page.tsx`, `src/app/[locale]/franchises/[franchise]/page.tsx`, or `src/app/[locale]/franchises/[franchise]/[slug]/page.tsx` export `generateMetadata`. Confirmed by curl: home, franchise listing, franchise detail, and a product page all render the identical `<title>KurdishTCG</title>` and `<meta name="description" content="Real trading card releases, sourced and shipped from Erbil."/>`. Every indexable page is duplicate-content from a title/description standpoint. Fix: add `generateMetadata` to each of those four page files using the already-fetched `product`/`franchiseData` (name, description, image, price — see `src/lib/data/index.ts` `mapProductRow`/`mapFranchiseRow`, both locale-aware via `pick()`).

2. **No `sitemap.ts` and no `robots.ts`/`robots.txt`.** `curl -I http://localhost:3000/robots.txt` and `/sitemap.xml` both return 404 (real Next.js not-found page, not a silent fallback — but the files simply don't exist). No file matching `sitemap*`/`robots*` anywhere under `src/app/`. Per `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/{sitemap,robots}.md`, add `src/app/robots.ts` and `src/app/sitemap.ts` (note: these are NOT locale-scoped — they belong at `src/app/`, above `[locale]`). `robots.ts` should `Disallow: /api/`, `/*/account`, `/*/checkout`, `/*/cart` and reference the sitemap; `sitemap.ts` should enumerate `en/ar/ckb` × home/franchises/each franchise/each product with `alternates.languages` per the "Generate a localized Sitemap" pattern in the doc, pulling franchise/product slugs from `src/lib/data`.

3. **No Open Graph or Twitter Card tags on any page.** Zero `og:*` or `twitter:*` meta tags confirmed via curl on all four page types. Product pages have real `product.image` (absolute Supabase URLs) available but nothing surfaces them for link previews (WhatsApp/Facebook sharing, which matters a lot for an Iraq-market storefront where WhatsApp is a primary channel). Fix inside the same `generateMetadata` additions from #1: set `openGraph: { images: [product.image], type: "website" }` and matching `twitter: { card: "summary_large_image", images: [product.image] }`.

4. **No `metadataBase`, no canonical URLs, no hreflang/`alternates.languages` anywhere.** `NEXT_PUBLIC_SITE_URL` exists in `.env.local` but is never read anywhere in `src/` (grep for `metadataBase`/`NEXT_PUBLIC_SITE_URL`/`SITE_URL` only hit unrelated files `src/app/api/fib/retry/route.ts` and `src/app/api/checkout/route.ts`). Without `metadataBase` + `alternates.canonical`/`alternates.languages`, Google will treat `/en/...`, `/ar/...`, `/ckb/...` as three separate near-duplicate pages with no relationship signal, and `routing.ts` uses `localePrefix: "always"` (every locale including default gets a prefix, so `/` itself isn't a duplicate root — but the three locale trees still need hreflang). Fix: set `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!)` in `src/app/[locale]/layout.tsx`, and add `alternates: { canonical: ..., languages: { en: ..., ar: ..., ckb: ... } }` in each page's `generateMetadata` (needed once per unique route, not just the layout, since canonical must be the exact current URL).

5. **No structured data (JSON-LD) at all.** `grep -r "application/ld+json"` across `src/` returns zero matches; curl confirms zero `<script type="application/ld+json">` in rendered HTML of home or product pages. No `Product` schema (price/currency IQD/availability) on product pages, no `Organization`/`WebSite` schema on the home page. Given this is a commerce site whose main differentiator is real stock with IQD pricing, this is a meaningful loss of rich-result eligibility. Fix: add a JSON-LD `<script>` in `src/app/[locale]/page.tsx` (Organization + WebSite) and in `src/app/[locale]/franchises/[franchise]/[slug]/page.tsx` (Product, with `offers: { price: product.price, priceCurrency: "IQD", availability: product.stock > 0 ? "InStock" : "OutOfStock" }` — currency default confirmed as `"IQD"` in `src/lib/data/index.ts` line 283).

### Major

6. **No `manifest.ts`/`site.webmanifest`.** `curl` confirms both `/manifest.json` and `/site.webmanifest` 404. Only `src/app/favicon.ico` exists as an icon convention — no `icon.png`/`apple-icon.png`/`manifest.ts`. Add `src/app/manifest.ts` (per Next's file-convention API) with name, short_name, theme_color, icons — improves "Add to Home Screen" and is a minor Google Search Console signal.

7. **Franchise listing page (`src/app/[locale]/franchises/page.tsx`) and every franchise detail page share the exact same generic title/description as the home page** — not just missing their own, but literally rendering the site tagline on `/franchises/avatar`, `/franchises/lorcana`, etc. This is the most user-visible duplicate-title case since these are the pages most likely to actually rank (franchise/category pages typically outrank a thin homepage). Same fix as #1, prioritize this page.

### Minor

8. **`src/components/franchise-tile.tsx` line 29: `alt=""` on the franchise cover image.** This image is the primary visual identity of the tile (not decorative — it's the main content element, gradient overlay + badge sit on top of it). Adjacent visible text (`franchise.name` in the `<h3>`) mitigates it somewhat for accessibility, but for image search it's a missed opportunity. Change to `alt={franchise.name}`.

9. **URL/i18n structure is otherwise sound**: `routing.ts` uses `localePrefix: "always"`, so `/en/`, `/ar/`, `/ckb/` are consistently prefixed and independently crawlable; slugs (`franchises/avatar/mtg-prerelease-box`) are clean and human-readable. This is fine as-is — the only real gap is the missing canonical/hreflang wiring already covered in Blocker #4.

10. **Viewport meta tag is present and correct** (`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>`, set via `viewport: Viewport` export in `src/app/[locale]/layout.tsx` line 20) — no action needed.

11. **404 handling is correct**: bad locale, bad franchise slug, and bad product slug (`notFound()` calls in `src/app/[locale]/franchises/[franchise]/page.tsx` line 51 and `.../[slug]/page.tsx` line 25) all return genuine HTTP 404 with Next's not-found page (`<meta name="robots" content="noindex"/>` present), not a silent redirect or 200. Verified via curl status codes. No action needed.

12. **Heading hierarchy is clean across all checked page types** — exactly one `<h1>` per page (home, franchises listing, franchise detail, product detail all confirmed via curl grep count = 1), with logical `<h2>` nesting on the product page ("Description", "Related"). No action needed.

*(Note: item 8's `alt=""` fix, and blockers 1–5, were subsequently implemented by subagent 6 below.)*

---

## 4. Performance and rendering-strategy audit

**Key environment fact (verified against installed docs, not assumed):** `cacheComponents` is **not** enabled in `next.config.ts`, so this app runs the "Previous Model" documented in `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md` — classic `fetch` caching, `export const revalidate`, `export const dynamic`, `generateStaticParams`, `unstable_cache`. None of the Cache Components APIs (`"use cache"`, `cacheLife`, `cacheTag`) apply here. All findings below are checked against that doc plus `getting-started/12-images.md` and `03-api-reference/02-components/image.md`.

### BLOCKER

**1. Home page and franchise-listing pages are baked static forever with live commerce data, and have zero revalidation.**
`src/app/[locale]/page.tsx`, `src/app/[locale]/franchises/page.tsx`.
Build output confirms both render as `● (SSG)` for en/ar/ckb. They call `getFranchises()`/`getFeaturedProducts()` (→ Supabase via `getSupabaseClient()`), whose underlying `fetch` calls set no `cache` option. Per the docs, an uncached fetch reached before any Request-time API still executes and gets baked into the HTML at build time; with no `revalidate` export, the route default is `false` (cache indefinitely — i.e., stale until the next deploy). Stock counts (`totalStock`), franchise card counts, and the "featured" carousel will not update until a redeploy.
**Fix:** add `export const revalidate = 300;` (or similar, in seconds — must be a statically-analyzable literal per the doc) to both files. This is the classic ISR knob from `caching-without-cache-components.md` §"Route segment config `revalidate`".

**2. No data-layer caching/memoization at all — every page does 2-3 full-table Supabase scans per request.**
`src/lib/data/index.ts`. `fetchAllProducts()` runs `SELECT * FROM products` (no filter, no limit) and is called from `getFranchises`, `getFranchise`, and `getProducts`. `getRelatedProducts()` calls `getProducts()` which calls `fetchAllProducts()` again. Result: a single product-detail page view triggers `getProductBySlug` (1 targeted query) + `getFranchise` (1 full-table scan) + `getRelatedProducts→getProducts` (1 more full-table scan) — two redundant full-table reads per page view, with **zero** memoization. There is no `import { cache } from "react"` anywhere and no `unstable_cache` anywhere in `src/`.
**Fix:** wrap `fetchAllProducts` in React's `cache()` (dedups within one render pass — see "Deduplicating requests" in the caching doc) and wrap it (or `getFranchises`/`getProducts`) in `unstable_cache(fn, keyParts, { revalidate: N, tags: [...] })` for cross-request caching, since Supabase's client doesn't go through Next's `fetch` cache in a controllable way here.

### MAJOR

**3. Product detail page has no `generateStaticParams` — fully SSR on every single request, the highest-traffic route type.**
`src/app/[locale]/franchises/[franchise]/[slug]/page.tsx`. Build confirms `ƒ` (dynamic). Given the task's premise (sealed packs/boxes catalog, infrequent price/copy changes), this is the strongest ISR candidate in the app and currently gets none of it.
**Fix:** add `generateStaticParams` (enumerate franchise+slug pairs from Supabase at build time, mirroring the locale-layout pattern) plus `export const revalidate = 300` so it upgrades to `●` SSG/ISR the way `franchises/[franchise]/page.tsx` already attempts to.

**4. `generateStaticParams` on `franchises/[franchise]/page.tsx` is currently a no-op.**
The file exports `generateStaticParams` (from `FRANCHISE_ORDER`), but build output shows it as `ƒ` (fully dynamic), not `●`. Reading `searchParams` (page/rarity/set/query/sort) forces the whole route dynamic every time in the classic model — that part is *correct* given the filter UI, but it means `generateStaticParams` here buys nothing today and the page still pays the full uncached-Supabase cost from finding #2 on every view, filtered or not.
**Fix:** this is fine to leave dynamic given the filter UX, but pair it with fix #2 (`unstable_cache` on the data layer) so the per-request cost of the *default* (no-filter) view stops being a full scan every time.

**5. `@supabase/supabase-js` (the full client SDK, incl. Auth/Realtime/Storage) is bundled into client JS shipped on every page, via the global `Footer`.**
`src/components/footer.tsx` (`"use client"`) statically imports `getSupabaseClient` from `src/lib/supabase/client.ts` just to upsert a newsletter email on submit. Footer renders in `src/app/[locale]/layout.tsx`, i.e. on every route. Verified via build artifacts: `.next/static/chunks/1y6fm9l4nm266.js` (244 KB raw / 63 KB gzip) is dominated by `@supabase`/`supabase-js` module markers, and it's not in a lazy boundary — it's a top-level import in an always-rendered client component.
**Fix:** either (a) move the newsletter upsert to a Route Handler / Server Action so the browser never needs `supabase-js` for this, or (b) `const { getSupabaseClient } = await import("@/lib/supabase/client")` inside the `onSubmit` handler so the SDK is only fetched when the form is actually submitted, not shipped in every page's initial bundle. The same SDK is legitimately needed client-side for `checkout`, `account`, and `account/orders/[id]` (session/auth), so those don't need to change.

**6. `Header` and `Footer` are single monolithic `"use client"` boundaries with mostly-static content.**
`src/components/header.tsx`, `src/components/footer.tsx`. Both render on every page. The desktop nav links, logo, and footer's four link columns + copyright are static markup, but the whole component tree is client-rendered because of one small stateful bit each (`Header`'s search `<input>`/`useState`, `Footer`'s newsletter `<input>`/`useState`). `CartButton`/`CartDrawer`/`ThemeToggle`/`LocaleSwitcher` are already correctly separate client islands and don't need to move.
**Fix:** split `Header` into a Server Component shell (logo, `NAV_ITEMS`, layout) plus a small client `<HeaderSearch />` island for the query input/submit; split `Footer` into a Server Component shell plus a client `<NewsletterForm />` island. This is global-nav code so the JS savings apply to every route, not just one page.

**7. Account pages ship zero server-rendered content and fetch everything client-side, causing a visible loading-spinner waterfall.**
`src/app/[locale]/account/page.tsx` and `src/app/[locale]/account/orders/[id]/page.tsx` are entirely `"use client"` with `useEffect` chains: mount → `supabase.auth.getUser()` → (on user resolved) a second effect fetches `orders`. Every visit pays: JS download → hydrate → auth round-trip → orders round-trip, with a spinner (`Loader2`) shown the whole time; build marks these `●`/`ƒ` but they carry no real HTML content either way. This is squarely a rendering-strategy issue (these are exactly the pages the task calls out as "needs live session data" — but "needs to be dynamic" doesn't mean "needs to be 100% client-fetched"). A server-rendered version using a cookies-aware Supabase server client (`@supabase/ssr`) wrapped in `<Suspense>` per the `cookies()`/runtime-API pattern in the caching doc would eliminate the double round trip. Flagging this because it's a caching/rendering-strategy fix, though the session-cookie plumbing itself overlaps with the Supabase-focused agent's territory — coordinate before implementing.

### MINOR

**8. `account/orders/[id]/page.tsx` fetches the same order twice via two separate implementations** — a `load` `useCallback` (used only for refresh) and a near-identical inline query inside the mount `useEffect`. Not a duplicate network call today, but it's two copies of the same query to maintain; consolidate into one function.

**9. Next Image config has no `formats` override** (`next.config.ts`). Default is WebP-only; AVIF is opt-in. Given ~1000-customer Iraq launch and a card-image-heavy catalog, adding `formats: ["image/avif", "image/webp"]` would shave further bytes, at the cost of slower build-time/first-request encodes. Not urgent — current default already avoids serving raw JPEG/PNG.

**10. Consider the Supabase-recommended custom image loader** (documented in `node_modules/next/dist/docs/.../images.md` under "Supabase") to have Supabase Storage's own transform CDN do resizing instead of double-hopping through Next's built-in Image Optimization API. Worth doing only if deployed somewhere that bills per image-optimization invocation (e.g. Vercel); skip if self-hosted.

**11. `formats`/image handling otherwise clean:** every `next/image` usage found (`product-card.tsx`, `franchise-tile.tsx`, `hero-card-stage.tsx`, `cart-drawer.tsx`, `cart/page.tsx`, `product-gallery.tsx`) correctly uses `fill` + explicit `sizes`, and `ProductGallery`'s primary image (`src/components/product-gallery.tsx:28`) correctly sets `priority` for LCP. The one raw `<img>` in the codebase (`src/components/fib-payment-dialog.tsx:192`) is a base64 QR code with explicit `width`/`height` and a documented eslint-disable — correctly exempted, not a bug.

**12. Fonts are handled correctly** — `src/app/fonts.ts` uses `next/font/google` for all 5 families with `display: "swap"` explicitly set, and no separate `@font-face`/FOUT-risk CSS exists in `globals.css`. No action needed.

### Build output summary

This Turbopack build (`Next.js 16.3.5`) does **not** print the classic per-route "Size / First Load JS" table — confirmed by running `npm run build` twice; only the route static/dynamic table is emitted. Approximated actual client bundle weight from `.next/static/chunks/` (gzip):

| Chunk | Raw | Gzip | Content |
|---|---|---|---|
| `1y6fm9l4nm266.js` | 244 KB | 63 KB | **`@supabase/supabase-js`** (confirmed via string grep) — see Major #5 |
| `22djakgbuw80y.js` | 229 KB | 72 KB | React/react-dom framework runtime (root, expected) |
| `26sm6eibobwc8.js` | 166 KB | 45 KB | unidentified (likely Next.js client runtime/router — in `rootMainFiles`, loads globally) |
| `0cz1d0mv5g_q7.js` | 113 KB | 39 KB | polyfills (`build-manifest.json` `polyfillFiles`) |
| `0_17qmm-bb7jj.js` | 71 KB | 24 KB | — |
| `2v9cohvucj1hu.js` | 53 KB | 17 KB | — |

Route table (from build): static/SSG (`●`) — `/[locale]`, `/account`, `/cart`, `/checkout`, `/franchises`, `/sell` (all 3 locales each). Dynamic (`ƒ`) — `/account/orders/[id]`, `/franchises/[franchise]`, `/franchises/[franchise]/[slug]`, `/search`, all `/api/*`. This split is the basis for Blocker #1 and Major #3/#4 above.

### Not flagged (checked, found fine)
- `next/image` usage across the codebase — responsive `sizes`, no missing width/height, correct `priority` on the LCP hero/gallery images.
- Font loading strategy (`next/font/google`, `display: swap`).
- `src/app/[locale]/layout.tsx` and `franchises/[franchise]/page.tsx` correctly use `generateStaticParams`.
- API routes correctly use `export const dynamic = "force-dynamic"` for mutation endpoints (`api/checkout`, `api/fib/*`).
- Cart/Checkout/Account being `"use client"` end-to-end for their *interactive* parts is appropriate — they're inherently per-session; the only issue is #7 (no server-rendered shell for read-mostly content) and #6 (bloat in globally-shared chrome, not these pages themselves).

*(Note: fix #1 [revalidate on home/franchises] was subsequently implemented directly by the orchestrator. Fixes #2–7 and the minor items are not yet applied.)*

---

## 5. Build/lint/debug sweep both apps

## Build-health summary
Both apps: lint clean, typecheck clean, production build clean (Next.js 16.3.5/Turbopack). No errors or warnings in any of the six checks. Browser runtime check: **skipped** — `list_connected_browsers` returned empty, Claude-in-Chrome not connected.

Not re-reporting: stock-decrement-on-confirm (TODO.md #4, already tracked as `[ ]`), FIB-on-localhost-webhook limitation (TODO.md #7, already tracked), governorate dropdown (#2), Google OAuth not enabled (#7).

### Blocker

**B1 — Duplicate `productId` entries in checkout bypass the stock check (oversell).**
`frontend/src/app/api/checkout/route.ts:67-107`. Stock is validated per-line (`product.stock < item.quantity`) against the *product's total stock*, not against quantity already committed earlier in the same request. `ids` is deduped via `Set` for the product lookup, but the `for (const item of items)` loop iterates the raw, non-deduped array. Sending `items: [{productId: X, quantity: 5}, {productId: X, quantity: 5}]` against a product with `stock: 5` passes both checks independently (5<5 false both times), inserts two `order_items` rows totaling 10 units against 5 in stock, and charges/records accordingly. Fix: merge items by `productId` (sum quantities) before pricing/stock validation, and again before building `orderItems`.

*(Note: B1 was subsequently fixed and live-verified by the orchestrator — see TODO.md §8.)*

### Major

**M1 — No idempotency guard on `/api/checkout`; double-submit creates duplicate orders and duplicate FIB payments.** `frontend/src/app/api/checkout/route.ts:34-187`. Each POST mints a fresh `crypto.randomUUID()` order id with no dedup key (no unique constraint on e.g. `(user_id, cart-hash, created_at)` — confirmed via `supabase/migrations/0003_fib_payments.sql`, only `orders_fib_payment_id_idx` exists, which is per-payment not per-checkout-attempt). A double-click or retried network request submits two independent orders; for `paymentMethod: "fib"` this also creates two live FIB payments, only one of which the customer is likely to pay, leaving a second real payable QR/order pair dangling. Fix: accept a client-generated idempotency key (e.g. UUID stored in sessionStorage per cart) and upsert/short-circuit on it, or apply a short server-side dedup window keyed on `(user_id ?? phone, item set, minute bucket)`.

**M2 — Same double-submit race in `/api/fib/retry`, can orphan a payable FIB payment.** `frontend/src/app/api/fib/retry/route.ts:19-97`. Two concurrent retry calls for the same order both pass the `RETRYABLE` check (both read `payment_status` before either writes), both cancel the old payment, both create a *new* FIB payment, then both `update` the order — last write wins. The losing request's freshly-created FIB payment is never linked to the order, but still exists and is payable at FIB with no DB record pointing to it. Fix: use a DB-level guard (e.g. conditional update `WHERE payment_status IN (...)` returning 0 rows aborts) or a short-lived advisory lock/row lock on the order before cancel+create.

**M3 — Orphaned/undeleted order row when `order_items` insert fails after order insert succeeds (both checkout paths).** `frontend/src/app/api/checkout/route.ts:151-157` and `:178-184`. The cleanup `await admin.from("orders").delete().eq("id", orderId)` result is never checked. If that delete itself fails (transient DB error), a naked `orders` row with `payment_status: "pending"`/no items remains — for the FIB path, its FIB payment has already been cancelled, but the row can confuse admin/reporting. Not atomic (no transaction/RPC wraps insert-order + insert-items). Fix: wrap order+items insert in a single Postgres function/RPC call so it's atomic, instead of two sequential inserts with manual best-effort rollback.

### Minor

**m1 — No runtime type validation on `CheckoutItem` fields beyond truthiness.** `frontend/src/app/api/checkout/route.ts:10-13, 54`. `productId` is only checked for truthiness (`!i.productId`), not that it's a string; a non-string value flows into `.in("id", ids)`. Currently harmless (Supabase just returns no match → `product_unavailable`), but it's a validation gap versus a real schema check (e.g. `zod`).

**m2 — Unbounded `items.length`, `quantity`, and free-text field lengths.** `frontend/src/app/api/checkout/route.ts:44-49, 54`. No cap on `items.length`, non-integer `quantity` isn't rejected (only `> 0` is checked, so `1.5` passes and produces fractional order totals), and `fullName`/`city`/`address`/`notes` have no max length before being written to Postgres. Low risk given COD/Iraq-only scale, but cheap to add `Number.isInteger(i.quantity)` and reasonable length caps.

*(Note: m1 and m2 were subsequently fixed alongside B1 by the orchestrator — item-count cap, integer-quantity check, and string-type check on productId were added together with the dedup fix.)*

**m3 — FIB error messages passed through to the client verbatim.** `frontend/src/app/api/checkout/route.ts:136`, `retry/route.ts:66`, `admin/refund/route.ts:55`. `err instanceof FibPayError ? err.message : "..."` forwards FIB's own error text to the browser response. Not a stack trace, but it's an unfiltered external-API string reaching the client — worth allowlisting known FIB error codes rather than passing the raw message through, in case FIB ever includes account/internal details in an error body.

**m4 — Webhook and status-poll endpoints have no rate limiting.** `frontend/src/app/api/fib/webhook/route.ts`, `frontend/src/app/api/fib/status/[paymentId]/route.ts`. Both are safe by design (they re-fetch truth from FIB rather than trusting input), but neither is rate-limited, so a known `paymentId` (or brute-forced UUID space) can be used to hammer the FIB status API / DB via repeated requests. Low priority pre-launch; worth a basic per-IP/per-payment rate limit before real traffic.

**m5 — Auth/authorization itself checked out clean.** `verifyAdmin` (`frontend/src/lib/supabase/verify-admin.ts`) correctly re-checks `profiles.role === "admin"` server-side via the service-role client (not trusting any client-supplied role), and both `fib/admin/refund` and `fib/admin/cancel` call it before touching FIB or the DB — no gap found here, noting only because it was explicitly in-scope to check.

### Files reviewed
`frontend/src/app/api/checkout/route.ts`, `fib/webhook/route.ts`, `fib/retry/route.ts`, `fib/status/[paymentId]/route.ts`, `fib/admin/refund/route.ts`, `fib/admin/cancel/route.ts`, `frontend/src/lib/fib.ts`, `fib-sync.ts`, `cors.ts`, `phone.ts`, `supabase/verify-user.ts`, `supabase/verify-admin.ts`, `supabase/admin.ts`, `dashboard/src/lib/fib-admin.ts`, `supabase/migrations/0003_fib_payments.sql`. Dashboard has no `src/app/api/` routes of its own (all FIB admin actions cross-call the frontend's routes above).

---

## 6. Implement SEO fixes on storefront

All SEO changes are in place, isolated to the intended files (the `messages/*.json`, `franchises/page.tsx`, `page.tsx`, `api/checkout/route.ts`, `footer.tsx` modifications shown as pre-existing from the orchestrator's session, not touched by me beyond what was asked).

### Summary

Read `node_modules/next/dist/docs/.../metadata/{sitemap,robots,manifest}.md` and `generate-metadata.md` first to confirm this Next 16.3.5 install's exact API shape (confirmed: `OpenGraphType` union has no `'product'` value, so product pages use `type: "website"`; sitemap.ts localized pattern uses `alternates.languages`; robots.ts rule shape is `{userAgent, allow, disallow}` + top-level `sitemap`).

**1. `src/app/[locale]/layout.tsx`** — added `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")` into the existing `generateMetadata`, nothing else touched.

**2. New helper `src/lib/seo.ts`** — `localizedAlternates(locale, path)` builds `canonical` + `languages` for en/ar/ckb, relative to `metadataBase`. Used by all 4 pages below.

**3. `generateMetadata` added to the 4 pages** (only added, existing JSX/logic/exports untouched):
   - `src/app/[locale]/page.tsx` — title/description from `meta` namespace (siteName/tagline), openGraph `type: "website"`, twitter summary_large_image. Also added Organization + WebSite JSON-LD (wrapped return in a `<>` fragment; the pre-existing hero JSX itself was not modified).
   - `src/app/[locale]/franchises/page.tsx` — title/description from `franchises` namespace (title/subtitle).
   - `src/app/[locale]/franchises/[franchise]/page.tsx` — calls `getFranchise(franchise, locale)` (a second fetch is unavoidable since the page component already fetches its own copy; no `cache()` wrapper existed so none was invented), falls back to site tagline when `franchiseData` is null (mirrors the page's own `notFound()` check) rather than throwing.
   - `src/app/[locale]/franchises/[franchise]/[slug]/page.tsx` — calls `getProductBySlug`, same not-found fallback pattern. Added `Product` JSON-LD (`offers.priceCurrency: "IQD"`, `availability` derived from real `stock`) via a `<script type="application/ld+json">` in the server component, `JSON.stringify`'d.

**4. `src/app/sitemap.ts`** (new) — enumerates home, franchises listing, every franchise, every product (fetched via `getFranchises`/`getProducts`, not hardcoded), 3 locale entries each with cross-linked `alternates.languages`. Excludes cart/checkout/account/api. Verified: 99 `<loc>` entries render.

**5. `src/app/robots.ts`** (new) — allows `/`, disallows `/api/` and `/{en,ar,ckb}/{account,checkout,cart}`, references `/sitemap.xml`.

**6. `src/app/manifest.ts`** (new) — name/short_name "KurdishTCG", `background_color: #f3f2f2` / `theme_color: #ec3013` (pulled from `globals.css` light-theme tokens), icon points at the existing `src/app/favicon.ico` (confirmed no `public/` dir or other icon assets exist at the time).

**7. `src/components/franchise-tile.tsx`** — `alt=""` → `alt={franchise.name}`.

**Verification** — curled the running dev server for every change: home (`<title>KurdishTCG</title>`, canonical, hreflang alternates, OG/Twitter tags, 2 JSON-LD scripts), `/en/franchises` (templated title "Every world we sell into, one shelf. · KurdishTCG"), `/en/franchises/avatar` (real franchise name/description/image in OG tags), `/en/franchises/avatar/weiss-schwarz-booster-box` (real product title/description/image/price, Product JSON-LD with correct `offers`), `/robots.txt`, `/manifest.webmanifest`, `/sitemap.xml`, and the franchise tile `<img alt="Riftbound">` etc. All rendered as expected in SSR HTML.

`npx tsc --noEmit` — clean, no errors. `npm run lint` — clean (0 errors, 0 warnings after removing two unnecessary `eslint-disable` comments for a rule that isn't configured in this project's ESLint config).

Nothing flagged as unverifiable — curl-based SSR inspection covered every requirement including the JSON-LD payload shape.

---

## 7. Storefront functional QA (second pass — live in Chrome)

## QA Report — KurdishTCG Storefront (English primary, AR/CKB spot-check, mobile ~390px)

**Environment note:** A stray authenticated Supabase session for `customer@kurdishtcg.test` was already present in the browser profile at the start of this run (leftover from prior testing), which initially made a "guest FIB" test look like it bypassed the sign-in gate. Re-tested properly signed out — the gate works correctly. Also, franchise/product counts and content fluctuated repeatedly during testing (e.g. Riftbound briefly showed "0 items", `ZZZ_QA_TEST_*` franchises/products appeared in listings) because the parallel admin-dashboard QA agent was actively creating/editing data during this session — not a storefront defect, just shared-environment noise.

### Blocker
None found.

### Major
1. **Order detail page shows a raw i18n key.** `/en/account/orders/[id]` heading literally renders `account.orderRef #3FC7A52B` instead of a translated "Order #…" string. Confirmed via console: repeated `IntlError: MISSING_MESSAGE: Could not resolve 'account.orderRef' in messages for locale 'en'` firing every ~5s (each payment-status poll). Repro: sign in, place any order, open its detail page.
2. **Newsletter signup fails silently.** Footer form POSTs to Supabase `newsletter_signups` and gets **403** (RLS blocks the anon insert) — no success or error feedback shown to the user at all, so they believe they subscribed. Present on every page's footer.
3. **"Graded" nav link is a no-op filter.** Header and footer "Graded" links go to `/franchises?graded=1`; the franchises listing page ignores the `graded` param entirely — identical results with or without it (verified side-by-side).
4. **Cart quantity isn't capped by stock.** On a product showing "Only 3 left," the cart drawer's `+` stepper let quantity go to 4 with no warning (subtotal math was still correct for the inflated qty). Checkout is server-validated per prior session's notes, but the UI gives zero warning before that point.

*(Note: all four Major findings above were subsequently fixed by the orchestrator — see TODO.md §10. #2's RLS fix is written as a migration but not yet applied.)*

### Minor
1. Checkout phone field: after typing an invalid number the error "Enter a valid Iraqi phone number…" appears; correcting it to a valid format leaves the same red error displayed (stale) until submit — cosmetic, doesn't block submission.
2. Mobile (~390px) product detail page: the Add-to-Cart quantity stepper/button visually overlaps the fixed bottom nav bar (nav sits over the button's bottom edge). Still clickable/functional (verified), but looks broken.
3. Console warning on home hero image recommending `loading="eager"` for LCP (perf only, not functional).

### Footer (explicitly requested — should be fixed from prior session)
Confirmed working with real, distinct content: **About, Contact, Shipping info, Returns, FAQ** (FAQ accordion expands correctly). Shop-column links (Franchises, Sell to us, Cart, Account) work. Newsletter signup is the one footer regression (see Major #2 above).

### Everything else tested and working correctly
- Home: franchise rail, featured grid, no console errors (besides the LCP warning). Hero design not evaluated per instructions; no functional/layout bugs from it.
- Franchises listing + filter bar: rarity checkboxes, sort (price asc/desc), search all filter/sort results correctly and match what's shown.
- Product detail: gallery, price, stock badge, add-to-cart all correct.
- Cart: add/remove/qty update, totals recalc, **persists across reload** — all confirmed.
- Checkout COD: real order created, phone validation correctly rejects bad formats.
- Checkout FIB: guest correctly gated behind sign-in (inline "Continue with Google" / email sign-in link, submit button disabled) once re-tested with a clean guest session; signed-in flow creates a real FIB payment with QR, readable code, countdown timer, and "Open in FIB app" deep link.
- Search (`/en/search?q=...`): relevant results.
- `/sell`: intentional "Coming soon" placeholder — working as designed.
- Arabic and Sorani Kurdish (RTL): home page and a product page both render correctly mirrored, no layout breakage.
- Mobile: home (bottom nav, franchise rail, grid), cart drawer, checkout form all clean.

### Orders created (real, left in place per instructions)
- **#1CE1A89D** — Cash on delivery, Kennen — Heart of the Tempest ×1, 5,750 IQD (ended up under the pre-existing `customer@kurdishtcg.test` account due to the leftover session noted above).
- FIB payment code **SNK3-NIPA-IVXL** — also under `customer@kurdishtcg.test`, left pending/unpaid.
- **#3FC7A52B** — Pay with FIB, Kennen — Heart of the Tempest ×1, 5,750 IQD, correctly under the designated `qa-temp-customer@kurdishtcg.test` account, FIB code **S9AL-K6II-KQGA**, left pending/unpaid (payment not completed, per instructions).

---

## 8. Supabase CRUD/filtering QA via dashboard (second pass — live in Chrome)

All tabs cleaned up. Here is my final report.

**Cleanup status: all clear.** All test data deleted and verified gone from both the dashboard and storefront (products list back to 25, franchises back to 6, search for "ZZZ_QA_TEST" returns 0 results, `/en/franchises/zzz-qa-test-franchise` returns 404). Real Riftbound/other franchise product data was independently verified intact via the dashboard (all 11 real Riftbound products present with original prices/stock).

### Findings

**Blocker**
1. **Riftbound franchise page currently shows "0 items" on the live storefront** (`/en/franchises/riftbound`), even though the dashboard confirms all 11 real Riftbound products still exist with correct data. This started after I deleted my test product/edited that franchise and has not self-corrected after multiple hard reloads with cache-busting query params over several minutes — it is not a stale-cache issue (the detail route is fully dynamic per a prior TODO.md note). This is currently live and affects real customers browsing the site's flagship franchise. Needs a dev-server restart or investigation into what create/delete triggered on that franchise slug broke its query/cache.

   *(Note: NOT a bug — root-caused by the orchestrator: all 11 real Riftbound products are `product_type: "single_card"`, so the packs-only filter implemented this same session correctly hides all of them. The user was asked and chose to leave Riftbound empty for now; an "out of stock / restocking soon" state was added to the franchise tile and listing page instead of a bare empty grid.)*

2. **A bad/unconfigured external image URL on a product silently crashes the entire franchise listing page for every visitor.** I set a product's image to `https://placehold.co/...` (host not in `next.config.ts`'s `images.remotePatterns`, which only allows the Supabase storage host). `next/image` throws `Invalid src prop ... hostname not configured`, and since nothing catches it, the whole `/en/franchises/[slug]` page fails to render ("This page couldn't load") for that franchise. The dashboard's own image field does not validate against the allowed host list, so an admin can accidentally take down a franchise page for all customers with one bad image URL/paste.

   *(Note: fixed by the orchestrator — product and franchise forms now validate the image URL's host before allowing save.)*

**Major**
3. **Order line items never render** — on both the orders list ("Items" column always shows 0) and the order detail page (Items table has Product/Qty/Price/Line headers but no rows), even though Subtotal/Total compute correctly. Confirmed on two different real orders (#AB3D74FE, #C383C5E5). Likely a broken `order_items`→`products` join in the dashboard's data fetching.

   *(Note: root-caused by the orchestrator — not a join bug. It's a live RLS policy on `order_items` that never got the `is_admin()` bypass clause `orders` itself has. Reproduced directly: an admin session gets the order but an always-empty `order_items` array, even though the row genuinely exists. Fix written as `supabase/migrations/0005_order_items_admin_read.sql`, NOT YET APPLIED — no DB access this session. This is the most operationally important unresolved item from the whole session: the shop owner currently cannot see what's inside any order.)*

4. **`/en/franchises` listing page shows wrong item counts and "from" prices for some franchises** — independent of the Riftbound outage above, SpongeBob showed "1 items · from 51,000 IQD" instead of the correct "2 items · from 27,000 IQD" both before and after my test data existed. Looks like an aggregation bug (picks one arbitrary product instead of the true min-price/count across the franchise) — same page also produced the "1 items · from [my test product's price]" numbers for Riftbound while it still had 12 products, before the outage above began.

   *(Note: the orchestrator's read is that this was very likely the packs-only filter taking effect mid-session, not a separate aggregation bug — `aggregateFranchise()`'s min-price/count logic was checked and looks correct. Logged in TODO.md as worth a fresh look, not confirmed as a real bug.)*

5. **New Product form: typing directly into the "Main image" URL field crashes the page** with an unhandled `Failed to construct 'URL': Invalid URL` (Next dev error overlay), losing all entered form data. Reproducible by typing character-by-character into that field. Setting the value in one atomic write (e.g., paste) does not trigger it, so this is specifically about how the live-preview/validation runs on partial input.

   *(Note: fixed by the orchestrator and live-verified in Chrome — typing "https://" then a full URL character-by-character no longer crashes the form.)*

**Minor**
6. **Required-field indicators are incomplete.** Product and franchise forms mark only the English name field with a red asterisk, but Arabic and Kurdish (Sorani) name fields are also required at submit time (submission is blocked and the fields highlighted red only after clicking Create). Same pattern on both the product and franchise "new" forms.
7. **Product-type dropdown still offers "Single card"** (and it's the default selection) alongside booster_pack/booster_box/starter_deck/blaster_box/collection_box, which no longer matches the business's packs/boxes-only direction (12 of 25 catalog products are still `single_card`, consistent with what was already known). Factual note only, not something I changed.
8. Dashboard's `/products?franchise=riftbound` URL query param does not pre-filter the list (shows all 25 products regardless) — minor deep-linking gap.

**Settings / contact info:** page loads fine; both `whatsapp_number` and `contact_email` are still empty, exactly as previously noted — the storefront's Contact page still has no live info. I did not modify or save anything.

**Stock decrement on order confirm:** confirmed still NOT automatic — the order detail page explicitly states "Stock is not changed automatically — adjust it on the product," matching the already-tracked TODO item. No new finding here, just confirmation of current behavior.

**Login/Overview:** admin login and overview stats loaded correctly with no console errors.
