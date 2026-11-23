-- A scheduled sale price per product, set in the admin product editor.
--
-- While now() is inside [sale_starts_at, sale_ends_at) every size of the
-- product sells at sale_price_cents (never above that size's own regular
-- price), and the regular price comes back on its own once the window
-- closes — nothing has to run at the end time, because the storefront and
-- /api/checkout both decide from these columns on every request.
--
-- A null start means "already started", a null end means "until removed".
-- A null sale_price_cents means no sale, whatever the dates say.
--
-- All three default to null, so applying this migration changes no price.
alter table products
  add column if not exists sale_price_cents integer,
  add column if not exists sale_starts_at timestamptz,
  add column if not exists sale_ends_at timestamptz;

alter table products
  drop constraint if exists products_sale_price_positive,
  add constraint products_sale_price_positive
    check (sale_price_cents is null or sale_price_cents > 0);

alter table products
  drop constraint if exists products_sale_window_order,
  add constraint products_sale_window_order
    check (sale_starts_at is null or sale_ends_at is null or sale_ends_at > sale_starts_at);
