-- Multi-item orders: a cart can now contain several sizes/quantities.
-- `items` holds the full line breakdown; `items_summary` is a human-readable
-- one-liner (e.g. "M x1, L x2"). The legacy single `size` column is retained
-- for older rows and left nullable.
alter table orders
  add column if not exists items jsonb,
  add column if not exists items_summary text;
