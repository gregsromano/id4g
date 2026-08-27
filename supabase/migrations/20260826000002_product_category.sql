-- Free-standing category label (T-Shirt, Hoodie, ...) for admin organization.
--
-- Deliberately NOT constrained by a CHECK/enum here: the fixed list of
-- allowed categories lives in application code (src/lib/product-options.ts)
-- so adding a new category is a code change, not a migration. A plain
-- nullable text column just stores whatever the app wrote.
alter table products
  add column if not exists category text;
