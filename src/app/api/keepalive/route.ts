import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Supabase pauses free-tier projects after ~7 days without database activity,
 * and a paused project means a paid order cannot be recorded. This route runs
 * on a daily Vercel cron (see vercel.json) purely so the database sees traffic.
 *
 * It must actually query a table — hitting the REST API alone is not counted
 * as database activity.
 */
export async function GET(req: NextRequest) {
  // Vercel signs cron invocations with CRON_SECRET when it is set. Reject
  // anything else so this cannot be used as a free DB-load endpoint.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error, count } = await getSupabaseAdmin()
    .from("orders")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("[keepalive] database query failed", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    orders: count ?? 0,
    checkedAt: new Date().toISOString(),
  });
}
