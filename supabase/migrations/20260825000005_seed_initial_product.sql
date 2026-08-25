-- Seed the existing single-product drop into the new catalog so it isn't
-- empty once the storefront switches from the PRODUCT constant to a real
-- product table. Values copied from src/lib/product.ts as it existed before
-- that constant was deleted. `on conflict do nothing` on both inserts makes
-- this safe to re-run (e.g. a second `db push`).
--
-- Images point at the existing static files already shipped in /public —
-- there's no need to re-upload them to Storage just to seed the row.
insert into products (
  id, slug, name, description, status,
  price_cents, currency, shipping_cents, weight_oz, tax_code,
  options, images
) values (
  '11111111-1111-1111-1111-111111111111',
  'brok3n-tee',
  'BROK3N Tee — I''ll Die For The Gospel',
  'Psalm 34:18 limited drop t-shirt',
  'active',
  4900,
  'usd',
  1500,
  6,
  'txcd_30011000',
  '[{"name": "Size", "values": ["S", "M", "L", "XL", "2XL", "3XL"]}]',
  '[{"url": "/shirt-front.png", "alt": "BROK3N Tee — front", "position": 0}, {"url": "/shirt-back.png", "alt": "BROK3N Tee — back", "position": 1}]'
)
on conflict (id) do nothing;

insert into product_variants (product_id, option_values, option_key, price_cents, position)
select '11111111-1111-1111-1111-111111111111', v.option_values, v.option_key, 4900, v.position
from (values
  ('{"Size": "S"}'::jsonb, 'Size=S', 0),
  ('{"Size": "M"}'::jsonb, 'Size=M', 1),
  ('{"Size": "L"}'::jsonb, 'Size=L', 2),
  ('{"Size": "XL"}'::jsonb, 'Size=XL', 3),
  ('{"Size": "2XL"}'::jsonb, 'Size=2XL', 4),
  ('{"Size": "3XL"}'::jsonb, 'Size=3XL', 5)
) as v(option_values, option_key, position)
on conflict (product_id, option_key) do nothing;
