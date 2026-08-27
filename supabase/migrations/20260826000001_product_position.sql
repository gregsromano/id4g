-- Manual display order for the storefront product grid.
--
-- Without this, the grid could only ever sort by created_at, giving the
-- admin no way to choose which product shows first. Lower position shows
-- first; new products default to the end of the current order (assigned in
-- application code at creation time, not by a DB default, since "the end"
-- depends on what already exists).
alter table products
  add column if not exists position integer not null default 0;

-- Backfill existing rows into a stable, deterministic order (oldest first)
-- so the initial state isn't every row tied at 0.
update products
set position = sub.rn
from (
  select id, row_number() over (order by created_at) as rn
  from products
) sub
where products.id = sub.id;

create index if not exists products_position_idx on products (position);
