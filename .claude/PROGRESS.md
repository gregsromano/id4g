# id4g — Session Progress

## Where things stand

**id4g ("I'm Down For The Gospel")** is a multi-product streetwear store deployed on
Vercel and git-connected, so **every push to `main` auto-deploys to production**. There
is no staging gate.

**Live at https://www.id4g.com** — `www` is canonical; the apex 308-redirects to it.

**🔴 STRIPE IS IN LIVE MODE. The site charges real cards as of 2026-08-14.**

Two products live (`brok3n-tee`, `jesus-john-316`). Admin back office at `/admin`:
orders/fulfillment, product catalog, lifestyle gallery, tracking import, profile.

### Done this session (2026-09-19)

**Product media can now be an MP4 video, not only a photo (`d479c9f`, fixed
by `410afe0`).** Uploaded from the same "+" tile, and ordered / made cover / removed
exactly like an image — video shares `products.images` and the `images` bucket
rather than getting a parallel list the admin would have to interleave by hand.

**The first version was BROKEN in production and Greg hit it immediately:** the
upload posted the file to a server action, and **Vercel caps a function request
body at 4.5MB**, so a real video 413'd and the admin saw "This page couldn't
load". The local verification missed it entirely because the synthetic test clip
was 83KB — well under a ceiling that only exists on Vercel. Now the browser PUTs
straight to Supabase with a signed token and the file never touches a function.
Re-verified by driving the real admin page in headless Chrome with a **30MB**
1920x1080 clip: signed URL -> direct PUT -> row recorded -> plays on the
storefront, no page error. `bodySizeLimit` was also corrected 25mb -> 4mb, since
anything above the platform ceiling is fiction.

**Video-ness is DERIVED from the URL extension (`src/lib/media.ts`), not stored.**
Every URL in that array is one this app uploaded and named itself
(`products/<id>/<uuid>.<ext>`), so the extension is reliable — and deriving it
means the image rows already in production needed no backfill, and no row can
carry a `kind` that disagrees with the file it points at.

**MP4 only, deliberately — `.mov` is rejected.** An iPhone `.mov` is usually HEVC,
which Chrome on Android and most Windows browsers will not play: it would upload
cleanly and look right to an admin on a Mac while showing a black box to a share of
real customers. There is no transcoding step on Hobby to normalize it, so the
format is restricted instead. Verified against the live API: `video/quicktime`
returns 415 `invalid_mime_type`.

**Video has its own 50MB cap; images stay at 8MB.** A short phone clip runs to tens
of megabytes. The limit is set on the BUCKET as well as in the action
(`20260919000001`) — the action can only see what the browser reports, while
Storage applies its own on the write path.

**Every render site had to branch, because `next/image` throws on a non-image
source** — one unguarded call breaks the whole page, not just the new feature.
Four sites: the product gallery, its thumbnail strip, the homepage card
(`ProductQuickView`), and both admin thumbnails (now one shared `CoverThumb` in
`ProductsTable` so the two cannot drift). The lightbox is image-only: a video
already plays inline with controls, so a modal copy would be a second player
competing with the first.

**Playback differs by context on purpose.** Gallery autoplays muted + looping WITH
controls; the homepage card drops the controls, since the whole tile is a `Link`
and a control bar would swallow taps meant to open the product; thumbnails and
admin lists never play and use `preload="metadata"`, so listing products does not
pull down a clip per row.

### Done this session (2026-09-16)

**🎉 THE FIRST REAL ORDER LANDED — the live webhook fired for the first time ever.**
Jeff Elder, BROK3N Tee Size L, `cs_live_b1rGaU…`. `orders` went 0 -> 1 row. Every
field reconciled against the live Stripe API, not just read back from the row:
$49.00 subtotal, `50OFF` -$24.50, **$24.50 charged**, Visa ••0728, `pi_3UGNHS…`
`succeeded`. It exercised **both** previously-untested paths in one go —
`delivery_method: "pickup"` (derived from the rate display_name, exactly as designed)
and the discount path (`amount_discount` + `discount_code` correct, so the 4-level
expand + second `promotionCodes.retrieve` works on a real order).

**`amount_tax: 0` is CORRECT, not a bug.** Buyer is in TX; CA is the only
registration. Stripe computed TX at 8.25% and returned
`taxability_reason: "not_collecting"` — positive evidence Stripe Tax works, rather
than an absence of tax. Nothing is owed to or filed with TX. Threshold monitoring is
**Dashboard-only** — every `/v1/tax/...thresholds` path 404s or rejects, so it cannot
be read or toggled from code.

**Discount codes can now be bounded: usage cap, start date, end date
(`ecb8676`).** The create form only ever sent a code + percentage, so every
code it had ever made was unlimited and permanent. Cap and end date are
Stripe's own create-only fields (so Stripe enforces them at redemption — no
window where a 26th customer slips through a 25-use code). The **start date is
ours**: Stripe has no start field, so a scheduled code is created INACTIVE with
`starts_at` in metadata and `syncScheduledCodes()` activates it once the time
passes — run on the checkout path and admin list, NOT a cron, because Hobby
allows one daily cron and a 9am sale would stay dark until the next run.
Dates carry the browser's UTC offset, since a bare `datetime-local` would be
read as UTC on Vercel and start a 9am sale at 2am Pacific.

**Storefront product order can now be shuffled per visit (`e299ff9`), with an
optional pinned #1 (`6c6312f`).** First version had a real flaw Greg caught:
with shuffle on, the drag/arrow ordering still saved but the storefront
ignored it, so a working save looked broken. Now one product can hold first
place while the rest shuffle, and the products table says when its order is
parked rather than silently accepting it. New
`site_settings` singleton table + `/admin/products` toggle, **off by default** so the
manual order stays the behavior until deliberately changed. Fisher-Yates, not
`sort(() => Math.random() - 0.5)` — the latter is biased toward the original order,
which on a 2-product catalog is almost exactly the bug being fixed. Verified over 12
requests on (7/5 split) and 6 off (identical every time). Works per-refresh only
because `/` is already `force-dynamic`.

### Done this session (2026-08-30)

**Discount codes, admin-managed and backed by Stripe.** New `/admin/discounts`
creates percent-off codes; checkout now shows Stripe's "Add promotion code" box
(`allow_promotion_codes: true`), and orders record `amount_discount` +
`discount_code`.

**Stripe is deliberately the source of truth, not a `discount_codes` table.**
Redemption, expiry and usage caps are enforced by the same system that takes the
money, so there is no second copy of that state to drift — and Stripe Tax
recomputes tax on the DISCOUNTED subtotal automatically, which is the part a
hand-applied discount silently gets wrong (it would under-collect CA tax on
every discounted order). A code is a Coupon (the percent) + a Promotion Code
(the customer-facing string); the admin presents the pair as one row.

**The `expand` depth bug this caught — worth remembering.** The webhook first
asked for `total_details.breakdown.discounts.discount.promotion_code`. That is
FIVE levels and **Stripe caps expand at four**, so the call 400s — which would
have broken the order insert for EVERY order, discounted or not, not just the
discount feature. At four levels `promotion_code` comes back as a bare id
string, so the code is now resolved with a second `promotionCodes.retrieve`,
wrapped in try/catch: losing the code label must never cost us the order row.

**Admin nav breakpoint moved `sm` -> `xl`.** Six links plus the wordmark, Live
site, avatar and Log out need ~1112px, so the bar scrolled horizontally below
that. Measured 390-1440px: `xl` is the first width where the full row fits.
This also **fixed a pre-existing overflow at 900px** that five links already had.

Verified in a real browser (create, deactivate/reactivate, duplicate rejection,
bad-percent rejection, 44px mobile tap targets, no h-scroll at 7 widths), and
end to end against the LIVE Stripe API: a code created through the admin UI
applies at checkout and the webhook extracts the right code and amount, with
the arithmetic reconciling. All test coupons/codes were deleted afterwards —
**Stripe has 0 coupons and 0 active codes**, and `orders` is still empty.

### Done 2026-08-29 — 27 commits

**1. Housekeeping first (`63961a4`, `da8dffa`).** The checkout was 49 commits behind;
after pulling, `npm install` had never been run against the new lockfile, so
`node_modules/@tiptap/` did not exist and `tsc` reported 8 phantom errors. Installing
fixed all eight with **no source change**. Then patched 6 high-severity advisories to
**0** (`next 16.2.10 → 16.3.3` + transitives), after checking the two scariest Next
advisories against this app's actual config — the proxy auth bypass needs single-locale
i18n (none here) and the rewrites SSRF needs a custom server (Vercel-managed, no
rewrites), so **neither was exploitable**. Re-pinned next to an exact version.

**2. Lifestyle gallery is now admin-managed (`5a64298` + follow-ups).** Was five
hardcoded `<Image>` tags. Now a `lifestyle_images` table with upload / drag-reorder /
alt text / remove at `/admin/lifestyle`. The storefront keeps the original hand-tuned
mosaic, now data-driven, **repeating every 5 images** with Prev/"N of M"/Next controls
that appear only above 5. Click-to-enlarge lightbox with arrow navigation across the
whole gallery. Reordering **auto-saves**; captions stay on the Save button.

**3. Admin profile photos + mobile overhaul (`7ca444a`, `6d1dd2e`, `9d0c1cf`).**
Circular avatar (`admin_users.avatar_url`), Live-site button, larger nav. Then a mobile
audit found four real problems, all fixed: the nav wrapped to five lines (~200px → 69px,
now a hamburger), the products table ran off-screen (now stacked cards), **reordering
did nothing at all on touch** (HTML5 drag events never fire on phones — added
up/down arrows), and 20px tap targets (now 44px). Admin images go one per row on phones.

**4. Local pickup at checkout (`165efb2`) — newest, least exercised.** Shipping was a
fixed line item on every order; it is now a Stripe `shipping_options` choice —
"Standard shipping" vs "Local pickup — free". **The address is still collected on
pickup orders on purpose**: Stripe Tax computes sales tax FROM that address, so
skipping it would silently under-collect CA tax. New `orders.delivery_method` column;
the webhook derives it from the **chosen rate's display_name, not a $0 amount**, because
comping shipping on a normal order would otherwise look identical to a pickup.

**5. Storefront polish.** Logo 40px → 104px (2.6x). About/Contact moved to pure `#000`
to match the homepage, and the paint-drip now fades via a radial mask — the PNG is a
rectangular photo with a dark background baked in, not a cutout, so `mix-blend-screen`
was showing its box edge. "About Greg" → "About Greg Romano" everywhere. Footer nav now
mirrors the header from one shared `src/lib/nav-links.ts`. Footer height 202px → 102px,
fonts 14px → 12px. Mobile hero shirt 342x354 → 390x473, full-bleed.

### Three bugs Greg found by clicking that testing missed

All three had a **correct data layer** and a broken browser experience, which is exactly
what DB-level verification cannot see. Worth remembering when verifying admin work.

- **Uploads appeared to do nothing** (`a04eae1`). They were writing rows and storing
  files the whole time; the grid never re-rendered. Two causes: the tile calls the
  action directly (so `revalidatePath` does not re-render), and `LifestyleGrid` seeded
  its order from props with `useState`, which reads them once. Greg ended up with a
  duplicate upload from clicking twice.
- **Remove crashed with a server error** (`4959360`). **React REPLACES a submit button's
  `name` with its own `$ACTION_ID_…` when the button carries a `formAction` server
  action**, so `name`/`value` never reaches the server. Fixed by binding the id into the
  action. The product image grid had the identical bug in Remove and Set-as-cover.
- **Lightbox X would not close** (`f93bb4d`). A regression from `cf26f9b`: removing the
  image container's max-width let it span under the X, and the container stops click
  propagation. Also fixed the gallery page resetting to 1 on reload (now `?lookbook=N`).

### NOT done / known gaps

- ~~No real-money order has ever been placed.~~ **RESOLVED 2026-09-16 — see below.**
  The live webhook fired, and the order exercised the pickup AND discount paths at once.
  The shipping path is still unexercised by a real card.
- **The LIFESTYLE uploader still POSTs files to a server action, so it inherits
  Vercel's 4.5MB request-body ceiling** — a lookbook photo between 4.5MB and the
  8MB its own validation allows will fail in production with a 413, not a readable
  message. Pre-existing (it predates the video work) and not yet hit in practice
  since photos are usually under 2MB. The fix is the same signed-upload pattern
  product media now uses (`createProductUploadUrl` / `attachProductUpload`).
- **`/api/admin/export` returns 500, not 401, when unauthenticated.** `requireAdmin()`
  throws, nothing catches it. No data is returned, so the security property holds; this
  is cosmetic and pre-existing.
- **Admin UI on production was never driven by Claude** — the live session secret
  differs from local, so all admin verification was done locally against the real
  database. Greg's click-throughs are the only production UI coverage. **He confirmed
  on 2026-08-29 that everything looks to be working**, including on a phone, after the
  three bugs below were fixed.
- Unmerged `origin/products-dashboard` (`3cfd6a6`) looks superseded by `cb64d49`.
- Tax: only California is registered; every other state gets $0. Historical `amount_tax`
  is null (unknown, deliberately not 0).
- Rate limiting is per-instance; shipping weight is an estimate (`UNIT_WEIGHT_OZ = 6`);
  `getSupabase()` in `src/lib/supabase.ts` is dead code; no batch packing-slip view.
- Supabase still free tier; no branded confirmation email; live Stripe branding empty.

## Next step(s)

1. **`50OFF` is still live, 50% off, uncapped and unexpiring** (1 redemption,
   Jeff's). Stripe will not accept a cap or expiry on an existing code —
   confirmed against the live API — so deactivating is the ONLY lever on it.
   Awaiting Greg's call. `ID4G` (20% off, 0 redemptions) is the same shape.
   New codes can now be bounded properly at creation.

2. **Jeff's order is unfulfilled.** Local pickup, so no label and no postage —
   it just needs handing over (or refunding, if it was a favour).

3. Optional: delete `origin/products-dashboard`; batch slip view; rotate
   `SUPABASE_SERVICE_ROLE_KEY`; delete dead `getSupabase()`.

**Active plan:** none in progress. `~/.claude/plans/i-want-to-build-keen-lollipop.md` is
the fulfillment-dashboard design record — fully implemented, and it predates the
multi-product catalog, so its single-product assumptions no longer describe the app.

## Notes / gotchas

- **Stripe caps `expand` at FOUR levels.** A five-level path 400s the whole
  request, so one greedy expand in the webhook breaks the order insert for
  every order, not just the case you added it for. On a checkout session
  `total_details.breakdown.discounts.discount` is the deepest legal path;
  `.promotion_code` under it is one too many and must be a second retrieve.
- **Discount codes live in Stripe, not in our database** (`src/lib/discounts.ts`).
  A local `discount_codes` table would be a second copy of redemption state that
  can only drift, and applying a percentage ourselves before handing Stripe a
  price would under-collect CA tax, since Stripe Tax computes on the discounted
  subtotal. Admin CRUD calls the Stripe API; nothing about codes is stored here.
  Deactivate rather than delete a code — redeemed codes are referenced by those
  orders.
- **React clobbers a submit button's `name` when it has a `formAction` server action** —
  it becomes `$ACTION_ID_…`, so `name`/`value` never reach the server. Bind the value
  into the action instead (`action.bind(null, id)`). This cost a live crash once.
- **`revalidatePath` does not re-render for a DIRECT action call**, only for a form
  submission. A tile that calls an action as a plain async function needs
  `router.refresh()` too — and any child holding list state in `useState` must re-seed
  from props, or the fresh data is discarded anyway.
- **Verify admin work in a BROWSER, not just against the database.** All three bugs
  found this session had a perfectly correct data layer.
- **VERCEL CAPS A FUNCTION REQUEST BODY AT 4.5MB** — hard, infrastructure-level,
  returns 413 FUNCTION_PAYLOAD_TOO_LARGE, and **cannot be raised**.
  `serverActions.bodySizeLimit` in next.config.ts can only LOWER the limit within
  that ceiling, so any value above ~4.5mb is fiction in production: it was set to
  `25mb` here for months and looked fine, because no upload had ever been big
  enough to find out. The consequence is not a friendly error but an unhandled
  413, which the admin sees as "This page couldn't load".
  **So a file bigger than ~4.5MB can never travel through a server action.**
  Product media therefore uploads BROWSER -> SUPABASE with a short-lived signed
  token (`createProductUploadUrl` mints it, the browser PUTs, then
  `attachProductUpload` records the row after verifying the object exists). Only
  the token crosses the function boundary, so the request stays kilobytes no
  matter how big the file is.
- **`next/image` THROWS on a non-image source**, so every place that renders an item
  out of `products.images` must branch on `isVideoUrl()` first (`src/lib/media.ts`).
  A missed branch does not degrade to a broken thumbnail — it breaks the whole
  page. There are four such sites: `ProductGallery` (main + thumbnail strip),
  `ProductQuickView`, and `ProductsTable`'s shared `CoverThumb`.
- **Checking rendered HTML is NOT enough for `<video>`.** React serializes
  `autoPlay` / `playsInline` into the markup as camelCase attributes, which HTML
  does not recognize — they look broken in `view-source` but resolve to correct DOM
  properties on hydration. Verify with the hydrated DOM (headless Chrome via CDP:
  `v.autoplay`, `v.paused`, `v.currentTime`), not `curl` output.
- **Muted is not optional for autoplay** — browsers refuse to autoplay a video with
  sound, and iOS Safari needs `playsInline` or it hijacks playback into fullscreen.
  Confirmed autoplaying at 390px width.
- **Wait for a Vercel deploy to settle before testing it.** Checking too soon returned
  the previous build three separate times this session and looked like a failed change
  each time. `vercel ls` age of ~1m+ is a reasonable gate; a cache-buster alone does not
  help while the rollout is still in progress.
- **`db push` was NOT safe on this project until 2026-08-29.** Nine migrations were
  applied outside the CLI and unrecorded; a plain push would have re-run them, and
  `20260826000001` ends in an unconditional backfill that rewrites `products.position`
  from `created_at` — which would have silently swapped the homepage product order.
  Repaired with `migration repair --status applied`. History is correct now.

- id4g lives INSIDE the gregromanoart repo folder (`~/Desktop/CLAUDE/id4g`) but is its
  own git repo (github.com/gregsromano/id4g) and its own Vercel project
  (`greg-romano-art/id4g`, Hobby plan). The parent `.gitignore` ignores `id4g/`.
  **Commits for id4g work belong in the nested repo, not the outer one.**
- **This is Next.js 16.3.3 — read `node_modules/next/dist/docs/` before writing code.**
  Verified this session: `middleware.ts` → **`proxy.ts`** (named `proxy` export, Node
  runtime, not configurable); `cookies()`/`params`/`searchParams` are **async-only**
  (sync access removed); cookies can only be `.set()` in route handlers or server
  actions, never during render; `revalidateTag` now needs a second `cacheLife` arg
  **and** is unusable here (tags only attach to `use cache` — off, since
  `cacheComponents` is disabled — or tagged `fetch`; we use the Supabase client), so
  **use `revalidatePath`**.
- **`import "server-only"` works with no new dependency** — Next aliases it internally
  via `create-compiler-aliases.js`, shared by webpack and Turbopack. It's what makes an
  accidental client import of the service-role key a *build failure*.
- **CORRECTION to a previous note:** piping a value via stdin to `vercel env add` DID
  work correctly this session (`printf '%s' "$VALUE" | npx vercel env add NAME
  production`). The earlier claim that stdin silently stores empty strings was wrong,
  at least for CLI 54.18.6. Verify with `vercel env ls` either way.
- **`vercel env pull` blanks out ALL encrypted values as `""`** — it CANNOT be used to
  verify env values. Verify against live behavior instead.
- **The Vercel CLI is already authenticated on this machine** (`gregsromano-8203`), so
  `vercel env add` / `vercel --prod` work directly. Don't assume otherwise.
- Supabase project ref is `rmgprcrciwvhbspvdjbx` (id4g). `xzbdvkfzernuphuqfunr` is
  GREG ROMANO ART — a different project. `.env.local` is correct; don't "fix" it.
- `.env.local` holds local-dev admin credentials (`ADMIN_PASSWORD=local-dev-password-2026`)
  so `npm run dev` → `localhost:3000/admin` works immediately. Gitignored; unrelated to
  production values.
- Two Supabase projects exist and BOTH auto-pause. GREG ROMANO ART is currently
  INACTIVE and has no keepalive.
- **DNS: id4g.com is registered at GoDaddy**, not Vercel DNS. The local resolver cache
  lies — verify with `dig +short @ns39.domaincontrol.com id4g.com`.
- **Verified 2026-08-29 against the live Stripe API**: the LIVE webhook endpoint is
  `enabled`, pointed at `https://www.id4g.com/api/webhooks/stripe`, subscribed to
  `checkout.session.completed`, and the key in `.env.local` is `sk_live_`. So if a real
  order does NOT record, the endpoint config is not the cause — look at the handler or
  the Supabase insert.
- Stripe webhooks: LIVE `we_1U4SQlQzBlVRwUbhVr44MJKp` → `https://www.id4g.com/api/webhooks/stripe`.
  SANDBOX `we_1U4S6SJk6ewcig7x6JLZ9gEm` still points at `id4g.vercel.app` (harmless).

## History
- 2026-09-19: **Product media accepts MP4 video** (`d479c9f`). Shares the existing
  `products.images` array and `images` bucket, with video-ness derived from the URL
  extension so no backfill was needed. MP4 only — an iPhone `.mov` is usually HEVC
  and would show a black box to Android/Windows customers while looking fine on a
  Mac, and there is no transcoding available on Hobby. Bucket widened to 50MB for
  video (images still capped at 8MB in the action). All four `next/image` call
  sites now branch, since that component throws on a video source and would take
  the whole page down. Verified in headless Chrome against the hydrated DOM.
- 2026-09-16: **First real order** + bounded discount codes + storefront shuffle. The live webhook fired for the first time ever
  (`orders` 0 -> 1), exercising the pickup and discount paths simultaneously; all
  amounts reconciled against the live Stripe API. Confirmed $0 out-of-state tax is
  correct behavior, not a defect. Shipped the storefront shuffle toggle (`e299ff9`).
  Found that the discount admin can only ever mint uncapped, never-expiring codes.
- 2026-08-30: Added **admin-managed discount codes** (`/admin/discounts`,
  percent-off), backed by Stripe rather than a local table so redemption and
  tax-on-discounted-subtotal stay Stripe's job. Caught before shipping: the
  webhook's 5-level `expand` exceeded Stripe's 4-level cap and would have 400'd
  the order insert for every order. Moved the admin nav to a hamburger below
  `xl`, fixing a pre-existing 900px overflow too.
- 2026-08-29 (later): Session wrap-up. Greg confirmed the site and admin are working,
  phone included. Verified the LIVE Stripe webhook endpoint is enabled and correctly
  subscribed, and that `orders` is empty — a clean baseline for the pending first real
  order, which he is waiting on a friend to place.
- 2026-08-29: **Large session, 27 commits.** Fixed a broken checkout (missing deps) and
  patched 6 advisories to 0. Built the admin-managed lifestyle gallery (upload,
  drag-reorder, alt text, pagination, lightbox, auto-save order). Added admin profile
  photos and made the whole admin usable on a phone (hamburger nav, product cards,
  touch reordering — drag had never worked on touch at all). Added **free local pickup**
  as a checkout option alongside shipping, with a new `delivery_method` column. Storefront
  polish: bigger logo, pure-black About/Contact with a masked paint-drip, matched
  header/footer nav, tighter footer, bigger mobile hero. **Fixed three bugs Greg found by
  clicking** — silent uploads, Remove crashing, and the lightbox X not closing (the last
  a regression from earlier the same day). Repaired the migration history, which had
  made `db push` unsafe.
- 2026-08-29: Housekeeping. Ran the missing `npm install` (49 pulled commits had added
  tiptap but node_modules was never updated, so `tsc` reported 8 phantom errors), then
  patched 6 high-severity advisories to 0 (`next 16.2.10 -> 16.3.3` + transitives),
  checking the two scariest Next advisories against this app's actual config rather than
  assuming they applied — neither was exploitable here. Re-pinned next to an exact
  version. Rewrote this file, which was 3 weeks and 49 commits stale.
- 2026-08-25 to 08-28: **Multi-product catalog + real admin accounts** (49 commits, not
  logged at the time). Replaced the hardcoded single product with `products`/
  `product_variants` and admin CRUD; rebuilt checkout to resolve variants server-side
  with a point-of-sale metadata snapshot; added `/about`, `/contact`, footer, galleries,
  rich-text descriptions; replaced the shared admin password with an `admin_users` table
  + `/admin/profile`.
- 2026-08-19: **Fixed live RLS exposure on `orders`** (confirmed exploitable before
  fixing), **re-enabled Stripe Tax** now that CA registration is active, and **built +
  deployed the admin fulfillment dashboard** at `/admin` — password auth that fails
  closed, unfulfilled queue, packing slips, notes, and a Pirate Ship CSV round-trip
  (they have no public API). Two migrations applied to production. Verified live on
  www.id4g.com; the real order was used for a full round-trip test then restored.
- 2026-08-14 (later): **Custom domain live.** Pointed id4g.com at Vercel (GoDaddy apex
  A record → 76.76.21.21), so the apex now 308-redirects to www.id4g.com. Moved
  `NEXT_PUBLIC_SITE_URL` and the LIVE Stripe webhook to www.id4g.com.
- 2026-08-14: **Went live on Stripe.** Found the real reason orders never recorded —
  no webhook endpoint had ever existed in Stripe. Created endpoints in both sandbox
  and live, fixed the handler to fail loudly (500 + retry) instead of silently
  returning 200, and recorded the first-ever order row. Removed sales tax from
  checkout. Restored the auto-paused Supabase project and added a daily keepalive cron.
- 2026-07-28: Built cart + multi-item checkout, deployed id4g to Vercel (off local),
  set up Supabase CLI + separate project, wired Stripe webhook + receipts, polished
  confirmation page. Stripe Tax coded but dashboard registration + a live sandbox
  order test remained.
