-- Site-wide settings: one row, keyed by a fixed id.
--
-- A single-row table rather than a key/value store. There is exactly one
-- storefront, and typed columns mean a boolean is a boolean — a `settings`
-- table of text values would need parsing and could hold 'ture' forever
-- without anything noticing. New settings are added as columns.
--
-- The fixed uuid is the lock that keeps it single-row: every read and write
-- addresses that id, so there is no "which row is current" question and no
-- ordering to get wrong. The check constraint makes a second row impossible
-- at the database level rather than by convention.
create table if not exists site_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid,
  -- When true the storefront grid is shuffled per request, so the product
  -- shown first rotates instead of always being whoever holds position 0.
  -- Default false: the manual order set in /admin/products stays the
  -- behavior until it is deliberately turned off.
  randomize_products boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

-- Seed the singleton so reads never have to handle "no row yet". Guarded so
-- re-running cannot fail against a database that already has it.
insert into site_settings (id) values ('00000000-0000-0000-0000-000000000001'::uuid)
on conflict (id) do nothing;

-- Same trust model as products/orders/lifestyle_images: the anon key is
-- public, so every read/write goes through the service-role client
-- (server-only), which bypasses RLS. This denies anon/authenticated entirely.
alter table site_settings enable row level security;
alter table site_settings force row level security;
