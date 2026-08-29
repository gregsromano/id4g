# id4g — Session Progress

## Where things stand

**id4g ("I'll Die For The Gospel")** is a multi-product streetwear store deployed on
Vercel and git-connected, so **every push to `main` auto-deploys to production**. There
is no staging gate.

**Live at https://www.id4g.com** — `www` is canonical; the apex 308-redirects to it.

**🔴 STRIPE IS IN LIVE MODE. The site charges real cards as of 2026-08-14.**

Two products live (`brok3n-tee`, `jesus-john-316`). Admin back office at `/admin`:
orders/fulfillment, product catalog, lifestyle gallery, tracking import, profile.

### Done this session (2026-08-29) — 27 commits

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
  database. Greg's click-throughs are the only production UI coverage.
- Unmerged `origin/products-dashboard` (`3cfd6a6`) looks superseded by `cb64d49`.
- Tax: only California is registered; every other state gets $0. Historical `amount_tax`
  is null (unknown, deliberately not 0).
- Rate limiting is per-instance; shipping weight is an estimate (`UNIT_WEIGHT_OZ = 6`);
  `getSupabase()` in `src/lib/supabase.ts` is dead code; no batch packing-slip view.
- Supabase still free tier; no branded confirmation email; live Stripe branding empty.

## Next step(s)

1. **Place one real order on a real card** at https://www.id4g.com — ideally **one of
   each**: a shipped order and a local pickup. Confirm both rows land in `orders` with
   the right `delivery_method`, that pickup shows its badge in `/admin`, then refund
   both from Stripe. The live webhook has never fired once; launch day should not be its
   first firing. **Needs a real card — only Greg can do this.**
2. **Click through `/admin/lifestyle` and `/admin/products` on a phone.** The mobile
   work was verified in an emulator, not on a real device, and Greg's real-device use
   has already caught three bugs an emulator did not.
3. Optional: delete `origin/products-dashboard`; batch slip view; rotate
   `SUPABASE_SERVICE_ROLE_KEY`; delete dead `getSupabase()`.

**Active plan:** none in progress. `~/.claude/plans/i-want-to-build-keen-lollipop.md` is
the fulfillment-dashboard design record — fully implemented, and it predates the
multi-product catalog, so its single-product assumptions no longer describe the app.

## Notes / gotchas

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
- Stripe webhooks: LIVE `we_1U4SQlQzBlVRwUbhVr44MJKp` → `https://www.id4g.com/api/webhooks/stripe`.
  SANDBOX `we_1U4S6SJk6ewcig7x6JLZ9gEm` still points at `id4g.vercel.app` (harmless).

## History
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
