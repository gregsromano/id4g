-- Colors of the SALE tag on product cards and product pages, set on
-- /admin/products. "#rrggbb" (validated in the app); null means the
-- original accent cyan with near-black text, so applying this changes
-- nothing on the live site.
alter table site_settings
  add column if not exists sale_badge_bg_color text,
  add column if not exists sale_badge_text_color text;
