import { createClient } from "@supabase/supabase-js";

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
