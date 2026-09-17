-- The product to hold first while the storefront shuffle is on.
--
-- Nullable with no default: "nothing pinned" is the normal state, not an
-- error, and it means the shuffle covers the whole catalog.
--
-- A column on the settings singleton rather than a `pinned boolean` on
-- products, because exactly one product can be pinned. A boolean per row
-- makes two pinned products representable, so the invariant would have to be
-- enforced by application code on every write — and the one time it is
-- missed, the storefront has two "first" products and no defined order
-- between them. Here it is unrepresentable.
--
-- ON DELETE SET NULL so deleting a pinned product clears the pin instead of
-- blocking the delete or leaving a dangling id that the storefront would
-- look up and silently drop from the grid.
alter table site_settings
  add column if not exists pinned_product_id uuid
    references products (id) on delete set null;
