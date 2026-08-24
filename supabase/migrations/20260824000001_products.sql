-- Products and variants: the schema behind the admin product dashboard.
--
-- STRICTLY ADDITIVE. This migration creates new tables and touches nothing
-- that exists. The live store prices from `src/lib/product.ts` and records
-- line items as jsonb on `orders`; both keep working exactly as they do now
-- after this runs. Moving checkout onto these tables is a separate, later
-- change that must be verified with a real card transaction first.
--
-- Money is integer cents everywhere, matching `orders` and product.ts. Never
-- floats: 49.00 in binary floating point is not 49.00.

create table if not exists products (
  id uuid primary key default gen_random_uuid(),

  -- URL segment, e.g. "brok3n-tee". Lowercase letters, digits and hyphens so
  -- it is safe to drop straight into a route.
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  name text not null check (length(trim(name)) > 0),
  description text,

  -- Default price for variants that do not override it.
  price_cents integer not null check (price_cents >= 0),

  -- Flat per-order shipping, mirroring shippingForCents(). Nullable so a
  -- product can defer to the store-wide default rather than restate it.
  shipping_cents integer check (shipping_cents >= 0),

  currency text not null default 'usd' check (currency = lower(currency)),

  -- draft: invisible to the storefront. active: purchasable.
  -- archived: hidden but preserved, since orders reference it historically.
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),

  -- Storefront ordering; lower sorts first.
  position integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per purchasable size of a product.
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,

  -- "S", "M", "2XL". Free text rather than an enum: the current sizes come
  -- from a hard-coded array, and a future drop may not be a t-shirt at all.
  size text not null check (length(trim(size)) > 0),

  -- Null means "use the parent product's price_cents".
  price_cents integer check (price_cents >= 0),

  -- Null means untracked (sell without decrementing), which is how the
  -- current single-drop store already behaves. 0 means genuinely sold out.
  -- These differ and the UI must not collapse them.
  stock integer check (stock is null or stock >= 0),

  sku text,
  position integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A product cannot list the same size twice.
  unique (product_id, size)
);

-- Uploaded imagery. Stores the Storage object path, not a signed URL, since
-- signed URLs expire and would rot in the table.
create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,

  storage_path text not null,
  alt text,
  position integer not null default 0,

  created_at timestamptz not null default now()
);

create index if not exists products_status_position_idx
  on products (status, position);
create index if not exists product_variants_product_idx
  on product_variants (product_id, position);
create index if not exists product_images_product_idx
  on product_images (product_id, position);

-- Keep updated_at honest without the application having to remember.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_updated_at on products;
create trigger products_updated_at
  before update on products
  for each row execute function set_updated_at();

drop trigger if exists product_variants_updated_at on product_variants;
create trigger product_variants_updated_at
  before update on product_variants
  for each row execute function set_updated_at();

-- RLS: deny by default, exactly as `orders` does.
--
-- No policies are defined deliberately. Every read and write goes through the
-- service role in the admin DAL, which bypasses RLS. When the storefront later
-- reads products directly with the anon key, add a policy limited to
-- status = 'active' at that point — not preemptively here.
alter table products enable row level security;
alter table products force row level security;

alter table product_variants enable row level security;
alter table product_variants force row level security;

alter table product_images enable row level security;
alter table product_images force row level security;
