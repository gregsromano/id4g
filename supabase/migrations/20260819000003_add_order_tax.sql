-- Record the tax component of an order.
--
-- Stripe Tax is enabled on checkout, so `amount_total` now includes sales tax,
-- but the tax portion was never stored — meaning the collected-tax figure
-- cannot be derived from our own data for a filing.
--
-- Both columns are deliberately NULLABLE WITH NO DEFAULT. A `default 0` would
-- make orders recorded before this migration claim "$0 tax collected" when the
-- truth is "unknown", and the dashboard would silently under-report tax
-- liability. Null means unknown; the UI renders it as "—", never "$0.00".
--
-- These cannot be backfilled from the database: existing rows hold only the
-- tax-inclusive `amount_total`. Recovering them would mean re-fetching each
-- session from Stripe by stripe_session_id.
alter table orders
  add column if not exists amount_tax integer,
  add column if not exists amount_subtotal integer;
