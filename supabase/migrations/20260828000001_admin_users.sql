-- Admin user accounts.
--
-- Replaces the single shared ADMIN_PASSWORD env var with real accounts (email
-- + password hash), so the operator can change their own password/email from
-- a profile page instead of editing Vercel env vars. ADMIN_PASSWORD is kept
-- around only as a one-time bootstrap key: the first login while this table
-- is empty creates the first row from whatever email/password are submitted,
-- provided that password matches ADMIN_PASSWORD (see /api/admin/login).
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Same trust model as every other table here: the anon key is public, so
-- without RLS anyone with the project URL could read password hashes. Every
-- read/write goes through the service-role client (server-only).
alter table admin_users enable row level security;
alter table admin_users force row level security;
