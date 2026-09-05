# id4g — Session Progress

## Where things stand

**id4g ("I'm Down For The Gospel")** is a multi-product streetwear store deployed on
Vercel and git-connected, so **every push to `main` auto-deploys to production**. There
is no staging gate.

**Live at https://www.id4g.com** — `www` is canonical; the apex 308-redirects to it.

**🔴 STRIPE IS IN LIVE MODE. The site charges real cards as of 2026-08-14.**

Two products live (`brok3n-tee`, `jesus-john-316`). Admin back office at `/admin`:
orders/fulfillment, product catalog, lifestyle gallery, tracking import, profile.

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

- **No real-money order has ever been placed.** The LIVE webhook has never fired. Now
  **more** important than before: checkout has TWO paths (ship / pickup) and neither has
  run with a real card. Still the #1 unverified link.
- **The pickup flow is untested end to end.** Verified against the live Stripe API that
  a session carries both rates ($15.00 / $0.00, correct tax codes) — that test session
  was expired so it could not be paid — but no order has actually been placed through
  either path, so `delivery_method` has never been written by a real webhook.
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

1. **WAITING ON A REAL ORDER.** Now also the first test of a discounted
   checkout — if the buyer uses a code, check `amount_discount` and
   `discount_code` on the row alongside the checks below. As of 2026-08-29 Greg is waiting for a friend to place a
   genuine order rather than testing it himself — a better test, since a fresh buyer
   exercises the whole flow. **Nothing to build; this is the open item.**

   When it lands, verify:
   - The row appears in `orders` at all — that alone proves the live webhook fired for
     the first time ever.
   - `delivery_method` matches what they picked (shipping / pickup), and a pickup shows
     its badge in the `/admin` queue.
   - `amount_tax` — the first real tax data. CA buyer should see tax; outside CA is $0
     and correct, since CA is the only registration.

   Baseline at the end of this session: **`orders` was empty (0 rows)**, so anything
   appearing is definitively that test. If it does NOT appear within a couple of
   minutes, the money still reached Stripe — the handler fails loudly (500 + retry) by
   design, so Stripe will retry; trace it by the payment id rather than assuming it was
   lost.

   Decide before refunding whether it is a real sale (fulfill it) or a favour (refund
   from Stripe's Payments page).

2. Optional: delete `origin/products-dashboard`; batch slip view; rotate
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
