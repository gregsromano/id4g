# id4g — Session Progress

## Where things stand

**id4g ("I'll Die For The Gospel")** is a single-product streetwear drop store — the
BROK3N tee ($49 + $15 flat shipping, sizes S–3XL), deployed on Vercel and
git-connected so every push to `main` auto-deploys.

**Live at https://www.id4g.com** — `www` is canonical; the apex `id4g.com` 308-redirects
to it. The original `id4g.vercel.app` still resolves as a fallback.

**🔴 STRIPE IS IN LIVE MODE. The site charges real cards as of 2026-08-14.**

### Done this session (2026-08-19)

**1. Fixed a critical security hole — RLS on `orders` (`227c1b8`).**
Supabase emailed a `rls_disabled_in_public` alert. It was real and live: the anon key
ships to the browser via `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and with RLS off, anyone with
the project URL could read/edit/delete every order — customer emails, names, shipping
addresses. **Confirmed the exposure before fixing** (an anon-key select returned real
rows), then enabled RLS with **zero policies** (deny-by-default) plus `force row level
security`. Verified after: reads return `[]`, inserts rejected `42501`, deletes affect
0 rows. Nothing broke — both consumers (Stripe webhook, keepalive cron) use the
service-role key, which bypasses RLS.

**2. Re-enabled Stripe Tax (`85e6ee1`).** State registration is now active, so restored
what `a7369c4` had removed. The checkout route is byte-identical to `03f2aa1`, the
version that previously worked. Verified against the live account: Tax status `active`,
**one active registration, US/CA**. A CA address returns 423¢ tax on a 6400¢ order
(8.625%); Texas (no registration) returns 0. Added a "Sales tax calculated at checkout"
note to the cart, since the cart can't compute tax (needs the shipping address Stripe
collects later) and its "Total" would otherwise understate the real charge.

**3. Built the admin fulfillment dashboard (`51b8c8c`) — the big one.**
Private back office at `/admin` for a solo operator. **Deployed and verified live on
www.id4g.com.**

- **Auth**: single shared password, HMAC-signed session cookie via Node `crypto`.
  **No new dependencies** anywhere in this feature. **Fails CLOSED** — if
  `ADMIN_PASSWORD` or `ADMIN_SESSION_SECRET` is unset/short, every login is rejected.
  This is deliberately the INVERSE of the fail-open `CRON_SECRET` check in
  `api/keepalive` — do not "fix" it toward consistency.
- **Two-layer boundary**: `src/proxy.ts` (Next 16 renamed `middleware`) does a
  cookie-PRESENCE check only, per the framework docs' warning that proxy must not be
  the authorization boundary. Real signature+expiry verification lives in
  `src/lib/admin-dal.ts`, which every page, action, and route handler calls. Server
  actions are reachable by direct POST regardless of which page declared them, so each
  one calls `requireAdmin()` first.
- **Features**: unfulfilled queue (default view), summary tiles, size breakdown for
  pulling inventory, order detail, tracking + carrier, internal notes, mark
  fulfilled/unfulfill, printable packing slips (light-on-white), CSV export, tracking
  import.
- **Pirate Ship**: researched and confirmed — **no public API exists**. Integration is
  a CSV round-trip: export carries our order id as a **Passthrough** column, which
  Pirate Ship returns in its own export, so tracking matches back exactly rather than
  by fuzzy name/address join. Re-import is idempotent (ship dates are not rewritten).
  `/admin/import` documents the click-path in-app.
- **Route groups**: cart moved from the root layout into `(store)` so it no longer
  renders on `/admin`. `/` and `/success` URLs unchanged.

**Migrations applied to production** (`20260819000002`, `20260819000003`):
`tracking_number`, `tracking_carrier`, `fulfilled_at`, `admin_notes`, `amount_tax`,
`amount_subtotal`, a `status` CHECK constraint, a `fulfilled_at` consistency
constraint, and a `(status, created_at desc)` index. The webhook now records
`amount_tax`/`amount_subtotal` going forward.

### How it was verified (not assumed)

- **18 auth tests** against the real crypto logic: fail-closed when unconfigured,
  forged signatures rejected, **expired-but-validly-signed tokens rejected**,
  `timingSafeEqual` length guard doesn't throw, two logins produce different tokens.
- **16 CSV tests**: RFC-4180 quoting, formula-injection escaping (`=+-@`), UTF-8 BOM,
  and parsing a realistic Pirate Ship export with flexible header detection.
- **Live production checks** on www.id4g.com: storefront 200; `/admin` redirects when
  unauthenticated; wrong password 401; export rejected without a cookie; **correct
  password 200 with a Secure session cookie**; dashboard renders the real open order;
  no cart on `/admin`.
- **Live round-trip against the real order** (then restored to its original `paid`
  state, tracking cleared): fulfilled → tracking recorded → **re-import idempotent** →
  both CHECK constraints reject invalid data → queue empties → storefront unaffected.
- A **forged cookie passes the proxy but is rejected by the DAL** — confirms the
  layering is doing what it claims.
- `tsc --noEmit`, `eslint`, and `next build` all clean.

### NOT done / known gaps

- **No real-money order has ever been placed.** The LIVE webhook has never fired. All
  end-to-end proof to date is sandbox. This is still the #1 unverified link.
- **Tax on historical orders is unknowable.** `amount_tax` is nullable with no default
  *deliberately* — a `default 0` would make old rows claim "$0 tax collected" when the
  truth is "unknown", under-reporting liability. The dashboard shows "—" and a
  "N orders predate tax tracking" caveat. Backfilling would mean re-fetching each
  session from Stripe by `stripe_session_id`.
- **Only California is registered for tax.** Every other state gets $0. Correct if CA
  is the only nexus, but if an economic-nexus threshold is crossed elsewhere, this
  will quietly under-collect. Stripe's Tax → Monitoring page tracks it; adding a
  registration needs no code change.
- **Rate limiting is per-instance.** Vercel serverless instances don't share memory, so
  spreading attempts across cold instances beats the 5-per-15-min budget. Password
  entropy is the real defense. Upgrade path if abuse appears: move counters into
  Postgres.
- **Shipping weight is an ESTIMATE** — `UNIT_WEIGHT_OZ = 6` + `PACKAGING_WEIGHT_OZ = 2`
  in `src/lib/fulfillment.ts`. Weigh a real package and true it up; under-declaring
  gets USPS postage-due charges.
- **`getSupabase()` (anon client) in `src/lib/supabase.ts` is dead code.** Now that RLS
  denies by default, any future use against `orders` returns empty rather than
  erroring — an easy thing to lose time debugging. Delete it or add policies
  deliberately.
- **No batch packing-slip view.** Printing 30 slips one at a time is the real
  bottleneck for a solo operator; `/admin/slips?ids=…` with `break-after-page` is the
  highest-value follow-on.
- Supabase still free tier; no branded confirmation email; live Stripe branding empty;
  no MX records on id4g.com.

## Next step(s)

1. **Place one real order on a real card** at https://www.id4g.com, confirm the row
   lands in `orders`, watch it appear in `/admin`, then refund it from Stripe. This is
   the last unverified link — launch day should not be the live webhook's first firing.
   It would also produce the first order with real `amount_tax` data.
2. **Save the admin password in a password manager** if not already done. There is no
   reset flow: rotating means updating `ADMIN_PASSWORD` in Vercel and redeploying.
   Changing `ADMIN_SESSION_SECRET` instead invalidates all sessions ("log out
   everywhere").
3. **Consider rotating `SUPABASE_SERVICE_ROLE_KEY`** — it was read from `.env.local`
   during verification work. Local file, likely fine; cheap insurance if it has ever
   traveled anywhere less private.
4. Optional: upgrade Supabase to paid; delete the dead `getSupabase()`; add the batch
   slip view; live Stripe branding.

**Active plan:** `~/.claude/plans/i-want-to-build-keen-lollipop.md` — the fulfillment
dashboard plan. **Fully implemented and deployed**; keep only as a design-rationale
record.

## Notes / gotchas

- id4g lives INSIDE the gregromanoart repo folder (`~/Desktop/CLAUDE/id4g`) but is its
  own git repo (github.com/gregsromano/id4g) and its own Vercel project
  (`greg-romano-art/id4g`, Hobby plan). The parent `.gitignore` ignores `id4g/`.
  **Commits for id4g work belong in the nested repo, not the outer one.**
- **This is Next.js 16.2.10 — read `node_modules/next/dist/docs/` before writing code.**
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
