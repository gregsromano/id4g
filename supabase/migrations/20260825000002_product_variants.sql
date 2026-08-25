-- Product variants: one row per sellable option combination (e.g. Size=M,
-- Color=Black). A real table rather than a jsonb array on `products` because
-- cart lines and order snapshots need a stable `variantId` primitive that
-- survives the admin editing a product's options later, and because
-- regenerating variants when options change is naturally a row diff
-- (insert new combos, update existing prices, delete removed combos).
--
-- `option_key` is a canonical string built by the app (sorted
-- "Name=Value|Name=Value", see variantOptionKey() in src/lib/products.ts) —
-- never computed by Postgres — used only to enforce "no duplicate combo per
-- product" via the unique index below.
--
-- No stock/quantity column: this store does not track inventory. Fulfillment
-- stays a manual pick-list off open orders, same as today.
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  option_values jsonb not null default '{}',
  option_key text not null,
  price_cents integer not null check (price_cents >= 0),
  sku text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists product_variants_product_option_key_idx
  on product_variants (product_id, option_key);

create index if not exists product_variants_product_id_idx
  on product_variants (product_id);

alter table product_variants enable row level security;
alter table product_variants force row level security;
