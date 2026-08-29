-- How the customer takes delivery: shipped, or collected in person.
--
-- Checkout now offers "Standard shipping" and "Local pickup — free" as Stripe
-- shipping options rather than always adding a flat shipping charge, so an
-- order can legitimately have zero shipping cost. Without this column the
-- fulfillment queue could not tell a pickup from a shipment except by
-- inferring it from a $0 shipping amount, which is exactly the kind of
-- guess that goes wrong the first time shipping is ever comped.
--
-- Nullable with no default, deliberately, following the same convention as
-- amount_tax: every order placed BEFORE this existed was shipped, but the
-- row itself has no record of that, and writing 'shipped' onto them would
-- state as fact something never actually captured. The admin renders null
-- as "—". Rows created from here on always carry a real value.
alter table orders
  add column if not exists delivery_method text
    check (delivery_method in ('shipping', 'pickup'));

-- The unfulfilled queue is the one screen read constantly, and pickups are
-- worked differently from shipments (no label, no postage), so this is
-- filtered on alongside status.
create index if not exists orders_delivery_method_idx
  on orders (delivery_method);
