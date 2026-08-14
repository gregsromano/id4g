# id4g — Session Progress

## Where things stand

**id4g ("I'll Die For The Gospel")** is a single-product streetwear drop store — the
BROK3N tee ($49 + $15 flat shipping, sizes S–3XL), deployed on Vercel and
git-connected so every push to `main` auto-deploys.

**Live at https://www.id4g.com** — `www` is canonical; the apex `id4g.com` 308-redirects
to it (that direction was deliberate, matching Vercel's domain config). The original
`id4g.vercel.app` still resolves and is a valid fallback.

**🔴 STRIPE IS IN LIVE MODE. The site charges real cards as of 2026-08-14.**

**Verified working end-to-end (real API calls, this session):**
- Cart → Checkout → payment → confirmation page → **order row written to Supabase**.
  A sandbox order (Jeff Studmffin, $64, M x1, TX) landed in `orders` with every
  field populated — email, name, total, items JSON, shipping address, status `paid`.
  This was the **first order row ever recorded**; see below for why.
- Live mode confirmed: `/api/checkout` on www.id4g.com returns a `cs_live_…` session.
- Webhook route returns 400 on unsigned requests.
- `/api/keepalive` returns 401 unauthenticated, 200 + row count with `CRON_SECRET`.
- Apex → www redirect verified (308) against Vercel's IP directly.

**Live Stripe account (`acct_1TyIjwQzBlVRwUbh`) is fully verified** — `charges_enabled`,
`payouts_enabled`, `details_submitted` all true, `requirements.currently_due` empty.
Nothing pending with Stripe. Display name "Greg Romano".

### The root cause that blocked this project since July

Orders never recorded because **no webhook endpoint existed in Stripe at all**. The
endpoint list was empty and `checkout.session.completed` events fired with
`pending_webhooks=0` — Stripe had nowhere to deliver. Earlier notes calling the
webhook "live and signature-verifying" were true only about the route existing.
Two separate faults made this invisible for weeks:
1. No registered endpoint (fixed — endpoints now exist in **both** sandbox and live).
2. The handler discarded the Supabase insert result and always returned 200, so
   even a failed write looked like success and Stripe never retried (fixed in
   `05da845`).

Both are for event `checkout.session.completed`, and **they are separate objects with
different signing secrets** — Vercel currently holds the LIVE secret.
- LIVE `we_1U4SQlQzBlVRwUbhVr44MJKp` → `https://www.id4g.com/api/webhooks/stripe`
- SANDBOX `we_1U4S6SJk6ewcig7x6JLZ9gEm` → still `https://id4g.vercel.app/...`
  (test-mode only, harmless; move it if sandbox testing resumes)

### Also fixed this session
- **Sales tax removed** (`a7369c4`). Stripe Tax charged $0 without state registrations,
  so checkout is now a clean flat $49 + $15 with no Tax line. Re-enabling is a few
  lines; the tax codes (`txcd_30011000` apparel, `txcd_92010001` shipping) are
  preserved in a comment in `src/app/api/checkout/route.ts`.
- **Supabase auto-pause guard** (`403e8b7`). The project HAD paused, which is what
  killed an earlier test order. Restored it, then added `/api/keepalive` + a daily
  Vercel cron (`vercel.json`, 14:17). It runs a real `count` query — Supabase counts
  *database* activity, not HTTP traffic, so pinging the site alone would not work.

**NOT done / known gaps:**
- **No real-money order has ever been placed.** The LIVE webhook has never fired.
  The end-to-end proof above was sandbox.
- **Supabase is still free tier.** The cron reduces pause risk but Vercel Hobby crons
  are best-effort. A paid plan (~$25/mo) is the only guaranteed fix.
- **No sales tax collected on live orders** — accrues as seller liability in most states.
- **No branded confirmation email.** Deliberately skipped to launch. Stripe's own
  receipt is the only email. Note Stripe never sends receipts in test mode, so the
  "no email" seen during sandbox testing was expected, not a bug.
- **Live branding empty** — no icon, logo, or primary color, so receipts look plain.
- **No MX records on id4g.com**, though a DMARC TXT record (`p=quarantine`, pointing at
  `onsecureserver.net`) exists. Nothing can receive mail at `@id4g.com` as configured.
  Not a launch blocker — Stripe sends receipts from its own domain.

## Next step(s)

1. **Place one real order on a real card** at https://www.id4g.com, confirm the row
   lands in `orders`, then refund it from the Stripe dashboard. This is the last
   unverified link — launch day should not be the live webhook's first firing.
   Use the www domain so it exercises the real customer path.
2. **Upgrade Supabase to a paid plan** before any real volume (user decision).
3. Optional polish: live branding (icon/logo/color), sales tax registrations,
   branded confirmation email, MX records for `@id4g.com`.

## Notes / gotchas
- id4g lives INSIDE the gregromanoart repo folder (`~/Desktop/CLAUDE/id4g`) but is its
  own git repo (github.com/gregsromano/id4g) and its own Vercel project
  (`greg-romano-art/id4g`, Hobby plan). The parent `.gitignore` ignores `id4g/`.
- **`vercel env pull` blanks out ALL encrypted values as `""`** — not just
  `NEXT_PUBLIC_*` as previously recorded, but `STRIPE_SECRET_KEY` and even
  `VERCEL_GIT_COMMIT_SHA`. It CANNOT be used to verify env values. Verify against
  live behavior instead (e.g. whether `/api/checkout` returns `cs_live_` or `cs_test_`).
- Setting env vars: `vercel env add NAME env --value "..." --yes`. Piping via stdin
  silently stores empty strings in this CLI version.
- Supabase project ref is `rmgprcrciwvhbspvdjbx` (id4g). `xzbdvkfzernuphuqfunr` is
  GREG ROMANO ART — a different project. `.env.local` is correct; don't "fix" it.
- Two Supabase projects exist and BOTH auto-pause. GREG ROMANO ART is currently
  INACTIVE and has no keepalive.
- Reading `.env.local` via `node --env-file` returned a stale/wrong value once this
  session and sent debugging down a false path. Trust the file contents.
- **DNS: id4g.com is registered at GoDaddy** (nameservers `ns39/ns40.domaincontrol.com`),
  NOT on Vercel DNS. Apex is a single `A @ → 76.76.21.21`; `www` is a CNAME to
  `…vercel-dns-017.com`. When checking DNS changes, the local resolver cache lies —
  a GoDaddy parking page kept appearing after the records were already correct.
  Verify with `dig +short @ns39.domaincontrol.com id4g.com` or
  `curl --resolve id4g.com:443:76.76.21.21` to bypass cache.

## History
- 2026-08-14 (later): **Custom domain live.** Pointed id4g.com at Vercel (GoDaddy apex
  A record → 76.76.21.21, replacing a parking record), so the apex now 308-redirects to
  www.id4g.com. Moved `NEXT_PUBLIC_SITE_URL` and the LIVE Stripe webhook to
  www.id4g.com and redeployed. Dropped a trailing period from the urgency line.
- 2026-08-14: **Went live on Stripe.** Found the real reason orders never recorded —
  no webhook endpoint had ever existed in Stripe. Created endpoints in both sandbox
  and live, fixed the handler to fail loudly (500 + retry) instead of silently
  returning 200, and recorded the first-ever order row. Removed sales tax from
  checkout. Restored the auto-paused Supabase project and added a daily keepalive
  cron. Pushed live key + live webhook secret to Vercel and redeployed. No
  real-money order placed yet.
- 2026-07-28: Built cart + multi-item checkout, deployed id4g to Vercel (off local),
  set up Supabase CLI + separate project, wired Stripe webhook + receipts, polished
  confirmation page (Back to Store + IG/TikTok icons). Stripe Tax coded but dashboard
  registration + a live sandbox order test remain.
