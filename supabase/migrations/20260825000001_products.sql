-- Product catalog.
--
-- Replaces the hardcoded PRODUCT constant with a real table so the admin can
-- create/edit multiple products. `options` describes the variant axes for
-- this product (e.g. [{"name":"Size","values":["S","M","L"]}]) — an array
-- rather than fixed columns so a product can have any number of option
-- dimensions (size only, size+color, none at all), not just Shopify's
-- hardcoded option1/2/3. `images` is an ordered array of {url, alt, position}
-- so the admin can reorder/caption without a separate table.
--
-- `status` gates storefront visibility: draft (being built, not yet public),
-- active (shown on the storefront), archived (no longer sold, but the row is
-- kept forever — orders snapshot their own name/price at purchase time, so
-- nothing downstream depends on this row staying unchanged or even active).
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'usd',
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  -- Nullable: falls back to the app-level UNIT_WEIGHT_OZ estimate when unset,
  -- same "unknown, not zero" convention as amount_tax on orders.
  weight_oz integer,
  tax_code text not null default 'txcd_30011000',
  options jsonb not null default '[]',
  images jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_status_idx on products (status);

-- Same trust model as `orders`: the anon key is public, so without RLS anyone
-- with the project URL could read draft/archived products or edit prices.
-- Every read/write goes through the service-role client (server-only), which
-- bypasses RLS, so this denies anon/authenticated entirely.
alter table products enable row level security;
alter table products force row level security;
