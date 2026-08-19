-- Enable Row-Level Security on `orders`.
--
-- The anon key is shipped to the browser via NEXT_PUBLIC_SUPABASE_ANON_KEY, so
-- without RLS anyone with the project URL could read, edit, and delete every
-- order — including customer emails, names, and shipping addresses.
--
-- `orders` is only ever touched server-side through getSupabaseAdmin() (the
-- Stripe webhook writes rows; the keepalive cron counts them). The service role
-- bypasses RLS, so enabling it with no policies denies all anon/authenticated
-- access while leaving both callers working.
alter table orders enable row level security;

-- Table owners bypass RLS unless it is explicitly forced. Without this, a
-- future migration or dashboard session acting as the owner would silently
-- skip the policies above.
alter table orders force row level security;
