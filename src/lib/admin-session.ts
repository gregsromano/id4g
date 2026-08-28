import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Signed session tokens for the admin dashboard.
 *
 * Sessions are tied to a real admin user account (see admin-users.ts) — the
 * token carries the account id (`sub`) so a page/action can look up which
 * admin is signed in. ADMIN_PASSWORD still exists as a one-time bootstrap
 * key (see /api/admin/login): the very first login, while the admin_users
 * table is empty, creates the first account from whatever email/password are
 * submitted, gated on that password matching ADMIN_PASSWORD. Every login
 * after that checks the submitted password against the account's stored hash
 * instead. Tokens are HMAC-signed with Node's built-in crypto: no new
 * dependencies, and nothing here ever runs in the browser (`server-only`
 * makes that a build error rather than a runtime surprise).
 */

export const ADMIN_COOKIE = "id4g_admin";

/** Seven days, in seconds and milliseconds. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

/** Bump to invalidate every token already issued. */
const TOKEN_VERSION = 2;

const MIN_BOOTSTRAP_PASSWORD_LENGTH = 12;
const MIN_SECRET_LENGTH = 32;

type SessionPayload = {
  /** Absolute expiry, ms since epoch. Verified server-side. */
  exp: number;
  v: number;
  /** admin_users.id this session belongs to. */
  sub: string;
  /** Random per-token id, so two logins never produce identical cookies. */
  jti: string;
};

export type VerifyResult =
  | { valid: true; exp: number; sub: string }
  | { valid: false; reason: "malformed" | "bad-signature" | "expired" | "unconfigured" };

/**
 * Read and validate the session-signing secret.
 *
 * Throws when missing or too short. The failure mode is that a misconfigured
 * deployment locks the operator OUT of /admin rather than letting the world
 * in — the protected resource is every customer's email and shipping
 * address, so fail-closed is the correct trade here.
 */
function requireSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `ADMIN_SESSION_SECRET is unset or shorter than ${MIN_SECRET_LENGTH} characters; admin access is disabled.`,
    );
  }
  return secret;
}

/** True when the session secret is present and long enough. Never throws. */
export function isAdminConfigured(): boolean {
  try {
    requireSessionSecret();
    return true;
  } catch (error) {
    console.error("[admin-auth]", (error as Error).message);
    return false;
  }
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

/**
 * Compare two strings without leaking their contents through timing.
 *
 * Both sides are hashed to a fixed 32 bytes first. That is not for secrecy —
 * it guarantees equal lengths, because `timingSafeEqual` THROWS on a length
 * mismatch rather than returning false, and it stops the length of the real
 * password leaking through the shape of the comparison.
 */
function safeEqual(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a, "utf8").digest();
  const digestB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(digestA, digestB);
}

/**
 * Constant-time check against ADMIN_PASSWORD — the one-time bootstrap key,
 * not a per-account password. Returns false (never true) if unconfigured.
 */
export function verifyBootstrapPassword(candidate: string): boolean {
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (password.length < MIN_BOOTSTRAP_PASSWORD_LENGTH) {
    console.error(
      `[admin-auth] ADMIN_PASSWORD is unset or shorter than ${MIN_BOOTSTRAP_PASSWORD_LENGTH} characters; bootstrap login is disabled.`,
    );
    return false;
  }
  return safeEqual(candidate, password);
}

/** Mint a signed session token for the given admin user. Throws if the secret is not configured. */
export function createSessionToken(userId: string): string {
  const secret = requireSessionSecret();
  const payload: SessionPayload = {
    exp: Date.now() + SESSION_MAX_AGE_MS,
    v: TOKEN_VERSION,
    sub: userId,
    jti: randomBytes(16).toString("hex"),
  };
  const payloadB64 = base64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

/**
 * Verify a session token.
 *
 * Order matters: the signature is checked against the RECEIVED payload string
 * before that string is ever parsed as JSON. Parsing first would mean feeding
 * attacker-controlled bytes to the parser on every request.
 */
export function verifySessionToken(token: string | undefined): VerifyResult {
  if (!token) return { valid: false, reason: "malformed" };

  let secret: string;
  try {
    secret = requireSessionSecret();
  } catch (error) {
    console.error("[admin-auth]", (error as Error).message);
    return { valid: false, reason: "unconfigured" };
  }

  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, reason: "malformed" };

  const [payloadB64, signature] = parts;
  const expected = sign(payloadB64, secret);

  // Length-guard before timingSafeEqual: it throws rather than returning false
  // when the buffers differ in length, and `signature` is attacker-controlled.
  const received = Buffer.from(signature, "base64url");
  const expectedBuf = Buffer.from(expected, "base64url");
  if (
    received.length !== expectedBuf.length ||
    !timingSafeEqual(received, expectedBuf)
  ) {
    return { valid: false, reason: "bad-signature" };
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return { valid: false, reason: "malformed" };
  }

  if (payload.v !== TOKEN_VERSION) return { valid: false, reason: "expired" };
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    return { valid: false, reason: "malformed" };
  }

  // Expiry is checked here, not left to the cookie's maxAge: a client is free
  // to keep sending a cookie the browser should have dropped.
  if (typeof payload.exp !== "number" || payload.exp <= Date.now()) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, exp: payload.exp, sub: payload.sub };
}

/** Cookie options shared by the login and logout routes. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    // Conditional: an unconditional `secure` cookie is never stored over
    // http://localhost, which would make dev login silently fail.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
