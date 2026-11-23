-- Optional shipping price that applies only while a product's sale is live
-- (e.g. 0 for free shipping during the sale), set next to the sale price in
-- the admin product editor. Null means the product's normal shipping_cents
-- applies even during the sale. Defaults to null, so nothing changes.
alter table products
  add column if not exists sale_shipping_cents integer;

alter table products
  drop constraint if exists products_sale_shipping_nonnegative,
  add constraint products_sale_shipping_nonnegative
    check (sale_shipping_cents is null or sale_shipping_cents >= 0);
