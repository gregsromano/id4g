-- Shuffle the homepage lookbook, independently of the product grid.
--
-- A second boolean on the settings singleton rather than reusing
-- randomize_products: the two galleries are unrelated surfaces, and the admin
-- asked to be able to shuffle one while the other keeps its manual order.
-- Sharing the flag would make that unrepresentable.
--
-- Default false, matching randomize_products: the manual order set in
-- /admin/lifestyle stays the behavior until it is deliberately turned on, so
-- applying this migration cannot change what the live site looks like.
alter table site_settings
  add column if not exists randomize_lifestyle boolean not null default false;
