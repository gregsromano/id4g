-- Marks a one-of-one piece as claimed. Independent of `status` on purpose:
-- a sold piece should stay status=active (still listed, still linked) so the
-- storefront keeps showing it with a "sold out" treatment instead of
-- vanishing the way archiving a product does.
alter table products
  add column if not exists sold boolean not null default false;
