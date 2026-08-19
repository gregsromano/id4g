-- Fulfillment tracking for the admin dashboard.
--
-- Until now `status` only ever held 'paid' (written by the Stripe webhook) and
-- there was no record of what had actually shipped. These columns let the
-- dashboard move an order to 'fulfilled', record a carrier tracking number,
-- and keep an internal note against the order.
alter table orders
  add column if not exists tracking_number text,
  add column if not exists tracking_carrier text,
  add column if not exists fulfilled_at timestamptz,
  add column if not exists admin_notes text;

-- `status` has never had a constraint, so normalize any unexpected value
-- BEFORE adding one. `db:push` runs against production and a constraint
-- violation would abort the migration midway.
update orders
   set status = 'paid'
 where status not in ('pending', 'paid', 'fulfilled', 'cancelled');

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('pending', 'paid', 'fulfilled', 'cancelled'));

-- A fulfilled order must record when it shipped, so the dashboard and any
-- future reporting can rely on fulfilled_at being present.
alter table orders drop constraint if exists orders_fulfilled_at_check;
alter table orders add constraint orders_fulfilled_at_check
  check (status <> 'fulfilled' or fulfilled_at is not null);

-- The dashboard's default view filters on status and sorts by created_at.
create index if not exists orders_status_created_at_idx
  on orders (status, created_at desc);
