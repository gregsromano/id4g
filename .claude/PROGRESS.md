# id4g — Session Progress

## Where things stand

**id4g ("I'll Die For The Gospel")** is a single-product streetwear drop store — the
BROK3N tee ($49 + $15 flat shipping, sizes S–3XL). It is **live and fully deployed on
Vercel at https://id4g.vercel.app**, git-connected so every push to `main` auto-deploys.

**Built and verified working (live, end-to-end):**
- **Cart → Checkout → Order Confirmed** flow:
  - Multi-size cart with quantities, localStorage persistence, cross-tab sync
    (`src/lib/cart-context.tsx`), slide-out drawer + floating cart button
    (`src/components/CartDrawer.tsx`, `CartButton.tsx`).
  - Product page uses "Add to Cart" (not direct buy); 3XL added to sizes.
  - `/api/checkout` builds Stripe line items from the cart, **prices server-side**
    (never trusts client), one flat shipping line.
  - Confirmation page (`src/app/success/page.tsx`): shows items/total/email, clears
    cart, **Back to Store** button + **Instagram/TikTok icon links** (@id4gospel).
- **Stripe** (currently in **sandbox/test mode**): checkout verified creating sessions;
  webhook `/api/webhooks/stripe` live and signature-verifying (returns 400 unsigned);
  Stripe email receipts enabled in dashboard. Test card `4242 4242 4242 4242`.
- **Supabase** (project ref `rmgprcrciwvhbspvdjbx`, SEPARATE from gregromanoart's DB):
  `orders` table with multi-item `items`/`items_summary` columns. Migrations applied via
  Supabase CLI (`supabase db push`). CLI installed as devDep; npm scripts `db:push`,
  `db:new`, `db:migrations`, `db:link`, `db:diff`.
- **Env vars** set in BOTH Vercel (all envs) and local `.env.local` (gitignored):
  Supabase URL + anon + service-role, `STRIPE_SECRET_KEY` (sk_test), `STRIPE_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_SITE_URL=https://id4g.vercel.app`.

**NOT done yet:**
- **Sales tax** — CODE is done and live (`automatic_tax` enabled, apparel + shipping tax
  codes, `tax_behavior: exclusive` in `/api/checkout`), but it charges $0 until the Stripe
  DASHBOARD setup is completed. See Next steps.
- **Not yet witnessed:** a real sandbox order actually writing a row to Supabase `orders`
  (everything is wired correctly; just needs one live test purchase to confirm visually).
- **Still in Stripe test/sandbox mode** — not selling for real money yet.
- No custom/branded confirmation email (relying on Stripe's built-in receipt).

## Next step(s)

> ⚠️ **2026-08-14: this list is superseded.** Current state lives in the
> `📍 CURRENT STATE` block of
> `../../References/Documentation/I Die For The Gospel_5_Status.md`, and the
> Stripe sequence in `Stripe-Go-Live-Checklist.md`. What the list below does
> NOT say: the id4g **Vercel project is not on Jeff's Vercel account** — it is
> Greg's, so steps 1 and 3 cannot be done from Jeff's machine at all.

1. **Finish sales tax (blocked on user — Stripe dashboard):**
   - Set origin/ship-from address + activate Stripe Tax: https://dashboard.stripe.com/settings/tax
   - Add state **registrations** (tax only charges in registered states):
     https://dashboard.stripe.com/tax/registrations
   - Then test a sandbox order shipping to a registered state → Tax line should appear.
   - Optional: add a "Tax calculated at checkout" note near the price on the product page.
2. **Place one sandbox test order** at id4g.vercel.app (card 4242…) and confirm the row
   lands in Supabase → Table Editor → `orders`. If not, check Stripe → sandbox → Webhooks
   → endpoint delivery log.
3. **Go-live checklist (when ready for real money):** switch Stripe to live mode; swap
   `STRIPE_SECRET_KEY` → `sk_live_…` on Vercel; create a LIVE-mode webhook (same URL
   `https://id4g.vercel.app/api/webhooks/stripe`, event `checkout.session.completed`) and
   put its `whsec_…` in Vercel; redeploy.

## Notes / gotchas
- id4g lives INSIDE the gregromanoart repo folder (`~/Desktop/CLAUDE/id4g`) but is its own
  git repo (github.com/gregsromano/id4g) and its own Vercel project. gregromanoart's
  `.gitignore` ignores `id4g/` to prevent tangling. `turbopack.root` is pinned in
  `next.config.ts` because of the nested-lockfile setup.
- `vercel env pull` blanks out `NEXT_PUBLIC_*` values in the pulled file — this is a CLI
  display quirk, NOT proof the values are empty. Verify real values via a live Stripe
  session's success_url if in doubt.
- Deploying env-var changes: use `vercel env add NAME env --value "..." --yes` (stdin piping
  silently stores empty strings in this CLI version).

## History
- 2026-07-28: Built cart + multi-item checkout, deployed id4g to Vercel (off local),
  set up Supabase CLI + separate project, wired Stripe webhook + receipts, polished
  confirmation page (Back to Store + IG/TikTok icons). Stripe Tax coded but dashboard
  registration + a live sandbox order test remain.
