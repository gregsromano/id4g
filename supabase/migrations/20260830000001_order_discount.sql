-- Record the discount applied to an order.
--
-- Checkout now shows Stripe's "Add promotion code" box, so an order's
-- `amount_total` can be lower than the sum of its line items with nothing in
-- the row explaining why. Without these columns a discounted order looks like
-- an underpayment, and the revenue figures on the dashboard cannot be
-- reconciled against the catalog price.
--
-- Two columns rather than one: the amount is what actually came off the order
-- (the number that reconciles the math), and the code is which promotion did
-- it (the number that answers "did the launch code get used"). Neither is
-- derivable from the other.
--
-- Both NULLABLE WITH NO DEFAULT, following the same convention as amount_tax
-- and delivery_method. A `default 0` on amount_discount would state as fact
-- that every order predating this column had no discount — true in practice
-- here, but never actually captured on the row, and the admin renders null as
-- "—" rather than inventing "$0.00". Orders placed from here on always carry
-- a real value, including 0 when no code was used: Stripe reports
-- total_details.amount_discount as 0, not null, on an undiscounted session.
alter table orders
  add column if not exists amount_discount integer,
  add column if not exists discount_code text;
