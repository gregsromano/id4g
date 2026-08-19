import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  ADMIN_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/admin-session";
import {
  checkRateLimit,
  clientKey,
  failureDelay,
  resetRateLimit,
} from "@/lib/rate-limit";

/**
 * Admin login.
 *
 * A route handler rather than a Server Action because it needs to set a cookie,
 * apply rate limiting, and distinguish 401 from 429 — all of which are natural
 * in an HTTP handler. (Cookies also cannot be set during a Server Component
 * render, only from a route handler or server function.)
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
  const password = typeof body?.password === "string" ? body.password : "";

  if (!verifyPassword(password)) {
    // One generic message for every failure mode. Never reveal whether the
    // server even has a password configured — that is information an attacker
    // can act on, and the operator can read the reason in the server logs.
    await failureDelay(startedAt);
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  let token: string;
  try {
    token = createSessionToken();
  } catch (error) {
    console.error("[admin-login] could not mint session", (error as Error).message);
    await failureDelay(startedAt);
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  resetRateLimit(key);
  (await cookies()).set(ADMIN_COOKIE, token, sessionCookieOptions());

  return NextResponse.json({ ok: true });
}
