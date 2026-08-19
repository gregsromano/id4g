import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Signed session tokens for the admin dashboard.
 *
 * A single shared password guards a solo-operator back office, so there is no
 * user table — a valid session just means "whoever this is knew the password".
 * Tokens are HMAC-signed with Node's built-in crypto: no new dependencies, and
 * nothing here ever runs in the browser (`server-only` makes that a build
 * error rather than a runtime surprise).
 */

export const ADMIN_COOKIE = "id4g_admin";

/** Seven days, in seconds and milliseconds. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

/** Bump to invalidate every token already issued. */
const TOKEN_VERSION = 1;

const MIN_PASSWORD_LENGTH = 12;
const MIN_SECRET_LENGTH = 32;

type SessionPayload = {
  /** Absolute expiry, ms since epoch. Verified server-side. */
  exp: number;
  v: number;
  /** Random per-token id, so two logins never produce identical cookies. */
  jti: string;
};

export type VerifyResult =
  | { valid: true; exp: number }
  | { valid: false; reason: "malformed" | "bad-signature" | "expired" | "unconfigured" };

/**
 * Read and validate the two required secrets.
 *
 * Throws when either is missing or too short. This is deliberately the INVERSE
 * of the fail-open check in `api/keepalive/route.ts` (`if (secret && ...)`,
 * which skips the check entirely when the env var is unset). That is fine for
 * a keepalive counter; it would be indefensible here, where the protected
 * resource is every customer's email and shipping address.
 *
 * The failure mode is that a misconfigured deployment locks the operator OUT
 * of /admin rather than letting the world in. That is the correct trade.
 * Do not "fix" this toward consistency with keepalive.
 */
function requireSecrets(): { password: string; secret: string } {
  const password = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `ADMIN_PASSWORD is unset or shorter than ${MIN_PASSWORD_LENGTH} characters; admin access is disabled.`,
    );
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `ADMIN_SESSION_SECRET is unset or shorter than ${MIN_SECRET_LENGTH} characters; admin access is disabled.`,
    );
  }
  return { password, secret };
}

/** True when both secrets are present and long enough. Never throws. */
export function isAdminConfigured(): boolean {
  try {
    requireSecrets();
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

/** Constant-time password check. Returns false (never true) if unconfigured. */
export function verifyPassword(candidate: string): boolean {
  let password: string;
  try {
    ({ password } = requireSecrets());
  } catch (error) {
    console.error("[admin-auth]", (error as Error).message);
    return false;
  }
  return safeEqual(candidate, password);
}

/** Mint a signed session token. Throws if the secrets are not configured. */
export function createSessionToken(): string {
  const { secret } = requireSecrets();
  const payload: SessionPayload = {
    exp: Date.now() + SESSION_MAX_AGE_MS,
    v: TOKEN_VERSION,
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
    ({ secret } = requireSecrets());
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

  // Expiry is checked here, not left to the cookie's maxAge: a client is free
  // to keep sending a cookie the browser should have dropped.
  if (typeof payload.exp !== "number" || payload.exp <= Date.now()) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, exp: payload.exp };
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
