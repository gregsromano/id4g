import { createClient } from "@supabase/supabase-js";

/**
 * Anon-key client, safe to construct in the browser.
 *
 * Its one caller is the admin media uploader, which needs a client-side
 * Storage client to PUT a file straight to Supabase with a signed token —
 * because Vercel caps a function request body at 4.5MB, so a real video can
 * never travel through a server action. The anon key grants nothing on its
 * own here: every table forces RLS, and the upload is authorized by the
 * short-lived signed token, not by this key.
 */
export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Every table with RLS forced (orders, products, product_variants) is only
 * reachable through the service-role client. A missing key would otherwise
 * produce an empty result set rather than an error, because RLS silently
 * denies the anon role everything — which reads as "no data" instead of a
 * config problem.
 */
export function assertServiceRoleConfigured() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "[supabase] SUPABASE_SERVICE_ROLE_KEY is unset; every query will return no rows because RLS is forced.",
    );
    throw new Error("Supabase service role key is not configured");
  }
}
