import { NextRequest, NextResponse } from "next/server";

import { clientKey } from "@/lib/rate-limit";
import { getSiteSettings } from "@/lib/settings";
import { subscribeEmail } from "@/lib/subscribers";

/**
 * Public endpoint behind the homepage email popup.
 *
 * A route handler rather than a server action because it is called from a
 * client component with fetch, needs its own rate limit, and wants to
 * distinguish 429 from 400 — all natural in HTTP.
 *
 * This is the only unauthenticated path in the app that creates Stripe
 * objects, so it is the one most worth abusing: every accepted request mints
 * a promotion code. Three things bound that. The popup setting must be on.
 * The IP is rate limited below. And the subscriber table's primary key is the
 * email, so repeat submits of the SAME address return the existing code
 * rather than minting another, no matter how many instances serve them.
 */

/**
 * A separate limiter from src/lib/rate-limit.ts, which is hardcoded to the
 * login budget (5 per 15 minutes). Signing up is not a login attempt: the
 * cost of a false positive is a lost subscriber rather than a locked-out
 * admin, and the budget here is about Stripe object creation.
 *
 * Per-instance, like the login one — the same caveat applies, and the same
 * upgrade path (move the counters into Postgres) if abuse ever shows up. The
 * email primary key is the real guarantee; this is the speed bump in front
 * of it.
 */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function allow(key: string): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  return {
    ok: bucket.count <= MAX_PER_WINDOW,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export async function POST(req: NextRequest) {
  // Checked server-side, not just in the UI: the endpoint is reachable by
  // direct POST whether or not the popup is rendered, so the off switch has
  // to actually close it.
  const { emailPopupEnabled } = await getSiteSettings();
  if (!emailPopupEnabled) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  const limit = allow(clientKey(req.headers));
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => null);

  const result = await subscribeEmail({
    email: typeof body?.email === "string" ? body.email : "",
    phone: typeof body?.phone === "string" ? body.phone : undefined,
    smsConsent: body?.smsConsent === true,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    code: result.code,
    alreadySubscribed: result.alreadySubscribed,
  });
}
