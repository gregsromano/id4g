import "server-only";

/**
 * Fixed-window rate limiting for the admin login route.
 *
 * IMPORTANT — this is a speed bump, not a wall. The counters live in the
 * memory of one serverless instance, and Vercel runs many; an attacker who
 * spreads attempts across cold instances gets more than the stated budget.
 * The real defense against a brute force here is the entropy of
 * ADMIN_PASSWORD. If abuse ever shows up in the logs, the upgrade path is to
 * move these counters into Postgres (a small `admin_login_attempts` table read
 * through `getSupabaseAdmin`), which is shared across instances.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets, for the Retry-After header. */
  retryAfterSeconds: number;
};

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Identify the caller. Vercel sets `x-forwarded-for`; the first entry is the
 * client. Falls back to a shared bucket when absent, which is stricter rather
 * than looser (everyone unidentified shares one budget).
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  return ip && ip.length > 0 ? ip : "unknown";
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
      retryAfterSeconds: Math.ceil(WINDOW_MS / 1000),
    };
  }

  bucket.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  return {
    allowed: bucket.count <= MAX_ATTEMPTS,
    remaining: Math.max(0, MAX_ATTEMPTS - bucket.count),
    retryAfterSeconds,
  };
}

/** Clear a bucket after a successful login, so a good password resets the budget. */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/**
 * Floor the time spent on a failed login so response timing doesn't
 * distinguish "wrong password" from "rate limited" from "not configured".
 */
export async function failureDelay(startedAt: number, floorMs = 200) {
  const elapsed = Date.now() - startedAt;
  if (elapsed < floorMs) {
    await new Promise((resolve) => setTimeout(resolve, floorMs - elapsed));
  }
}
