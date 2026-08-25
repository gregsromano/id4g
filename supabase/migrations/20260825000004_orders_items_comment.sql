-- Document the widened `items` contract now that the catalog is multi-product.
-- No column change — `items` is already jsonb — only the shape of what gets
-- written into it changes going forward.
--
-- New rows: [{productId, variantId, name, variantLabel, unitPriceCents,
-- unitWeightOz, quantity}, ...] — a full point-of-sale snapshot per line, so
-- an order keeps rendering correctly forever even after its product is
-- edited or archived.
--
-- Rows written before this migration only ever had {size, quantity} (or, for
-- the oldest rows, no `items` at all — see the legacy `size` column). Those
-- are synthesized into the new shape at read time by parseItems() in
-- src/lib/fulfillment.ts, not rewritten in place.
comment on column orders.items is
  'Point-of-sale snapshot per line: {productId, variantId, name, variantLabel, unitPriceCents, unitWeightOz, quantity}[]. Legacy rows ({size, quantity} or absent) are normalized by parseItems() at read time, not migrated in place.';
