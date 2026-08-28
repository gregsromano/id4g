import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  ADMIN_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyBootstrapPassword,
} from "@/lib/admin-session";
import {
  countAdminUsers,
  createAdminUser,
  getAdminUserByEmailWithHash,
  isValidNewPassword,
  verifyPasswordHash,
} from "@/lib/admin-users";
import {
  checkRateLimit,
  clientKey,
  failureDelay,
  resetRateLimit,
} from "@/lib/rate-limit";

const MAX_EMAIL_LENGTH = 320;

/**
 * Admin login.
 *
 * A route handler rather than a Server Action because it needs to set a cookie,
 * apply rate limiting, and distinguish 401 from 429 — all of which are natural
 * in an HTTP handler. (Cookies also cannot be set during a Server Component
 * render, only from a route handler or server function.)
 *
 * Two paths:
 *  - Normal login: email + password checked against the admin_users table.
 *  - One-time bootstrap: while admin_users is EMPTY, a submitted password
 *    matching ADMIN_PASSWORD creates the first account from whatever email
 *    was submitted, then logs it in. This is what lets the operator go from
 *    "no accounts yet" to a real account without needing direct database
 *    access. Once any account exists, this path is never reachable again —
 *    it only ever fires on an empty table.
 */
export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const key = clientKey(req.headers);

  const limit = checkRateLimit(key);
  if (!limit.allowed) {
    await failureDelay(startedAt);
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().slice(0, MAX_EMAIL_LENGTH) : "";
  const password = typeof body?.password === "string" ? body.password : "";

  // One generic message for every failure mode below. Never reveal which
  // part was wrong, or whether an account exists for that email — that is
  // information an attacker can act on, and the operator can read the real
  // reason in the server logs.
  const genericFailure = () =>
    NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });

  let userId: string;
  try {
    const existing = email ? await getAdminUserByEmailWithHash(email) : null;

    if (existing) {
      if (!verifyPasswordHash(password, existing.passwordHash)) {
        await failureDelay(startedAt);
        return genericFailure();
      }
      userId = existing.id;
    } else {
      const noAccountsYet = (await countAdminUsers()) === 0;
      if (
        !noAccountsYet ||
        !email ||
        !isValidNewPassword(password) ||
        !verifyBootstrapPassword(password)
      ) {
        await failureDelay(startedAt);
        return genericFailure();
      }
      const created = await createAdminUser(email, password);
      userId = created.id;
    }
  } catch (error) {
    console.error("[admin-login] lookup/create failed", (error as Error).message);
    await failureDelay(startedAt);
    return genericFailure();
  }

  let token: string;
  try {
    token = createSessionToken(userId);
  } catch (error) {
    console.error("[admin-login] could not mint session", (error as Error).message);
    await failureDelay(startedAt);
    return genericFailure();
  }

  resetRateLimit(key);
  (await cookies()).set(ADMIN_COOKIE, token, sessionCookieOptions());

  return NextResponse.json({ ok: true });
}
