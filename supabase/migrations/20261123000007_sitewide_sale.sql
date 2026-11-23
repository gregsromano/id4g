-- Store-wide percent-off sale, set on /admin/products: an on/off switch plus
-- an optional start/end window, like a product's own sale. While live, every
-- product sells at the lower of its own sale price and this percent off.
-- Decided per request by the storefront and /api/checkout, so it starts and
-- stops on time with nothing scheduled.
--
-- Off by default with no percent set, so applying this changes no price.
alter table site_settings
  add column if not exists sitewide_sale_percent integer,
  add column if not exists sitewide_sale_enabled boolean not null default false,
  add column if not exists sitewide_sale_starts_at timestamptz,
  add column if not exists sitewide_sale_ends_at timestamptz;

alter table site_settings
  drop constraint if exists site_settings_sitewide_percent_range,
  add constraint site_settings_sitewide_percent_range
    check (sitewide_sale_percent is null or sitewide_sale_percent between 1 and 90);

alter table site_settings
  drop constraint if exists site_settings_sitewide_window_order,
  add constraint site_settings_sitewide_window_order
    check (sitewide_sale_starts_at is null or sitewide_sale_ends_at is null
           or sitewide_sale_ends_at > sitewide_sale_starts_at);
