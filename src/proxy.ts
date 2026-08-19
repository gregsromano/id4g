import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (Next 16's replacement for Middleware — the `middleware.ts` filename
 * and the `middleware` named export are both deprecated).
 *
 * This is an OPTIMISTIC check only: it tests for the presence of the session
 * cookie and nothing more. It deliberately does NOT verify the HMAC.
 *
 * Two reasons, both from the framework docs:
 *   1. Proxy runs on every matched request including prefetches, so it must
 *      stay cheap.
 *   2. "Proxy is not intended for ... a full session management or
 *      authorization solution."
 *
 * The real check — signature and expiry — lives in the data access layer
 * (`src/lib/admin-dal.ts`), which every admin page, route handler, and server
 * action calls. A forged cookie sails past this file by design and is rejected
 * there. Do not add verification here.
 */

const ADMIN_COOKIE = "id4g_admin";
const LOGIN_PATH = "/admin/login";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(ADMIN_COOKIE)?.value);

  // Already signed in and heading to the login form — send them to the queue.
  if (pathname === LOGIN_PATH) {
    if (hasSessionCookie) {
      return NextResponse.redirect(new URL("/admin", request.nextUrl));
    }
    return NextResponse.next();
  }

  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // Scoped to /admin: the storefront must be untouched by this. The login API
  // routes are excluded so an unauthenticated POST can actually reach them.
  matcher: ["/admin/:path*"],
};
