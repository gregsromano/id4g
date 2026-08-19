import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_COOKIE, verifySessionToken } from "./admin-session";

/**
 * The admin data access layer — the ACTUAL security boundary.
 *
 * `src/proxy.ts` only checks that a session cookie exists; anything forged
 * gets through it. Every read of order data, every server action, and every
 * admin route handler must pass through one of the functions here, which
 * verify the token's signature and expiry for real.
 *
 * This matters most for Server Actions: a page-level check does NOT protect
 * them. Actions are independently reachable by direct POST regardless of which
 * page defined them, so each one calls `requireAdmin()` as its first
 * statement.
 */

/**
 * Verify the session, redirecting to the login page when it fails.
 *
 * Wrapped in React's `cache` so a layout, a page, and three data functions in
 * the same render verify once rather than five times.
 */
export const verifyAdminSession = cache(async (): Promise<{ exp: number }> => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const result = verifySessionToken(token);

  if (!result.valid) {
    redirect("/admin/login");
  }

  return { exp: result.exp };
});

/** Non-redirecting variant, for the login page (which must render logged out). */
export const isAdminAuthenticated = cache(async (): Promise<boolean> => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifySessionToken(token).valid;
});

/**
 * Assert an admin session from a Server Action or route handler.
 *
 * Throws rather than redirecting: a redirect thrown from the middle of a
 * mutation produces confusing behavior, whereas an error surfaces plainly.
 */
export async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifySessionToken(token).valid) {
    throw new Error("Unauthorized");
  }
}
