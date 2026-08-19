import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ADMIN_COOKIE } from "@/lib/admin-session";

/**
 * Admin logout.
 *
 * POST only, deliberately: a GET logout can be fired by anything that loads a
 * URL — an <img> tag on another site would sign the operator out.
 */
export async function POST() {
  (await cookies()).delete(ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}
