-- Announcement banner shown directly under the storefront menu, set in
-- /admin/menu. One banner on the settings singleton: text plus an optional
-- start/end window, decided on every request (the store layout renders per
-- request), so it appears and disappears on time with nothing scheduled.
--
-- Null/empty text means no banner. A null start means "already started", a
-- null end "until removed". Defaults to no banner, so applying this changes
-- nothing on the live site.
alter table site_settings
  add column if not exists banner_text text,
  add column if not exists banner_starts_at timestamptz,
  add column if not exists banner_ends_at timestamptz;

alter table site_settings
  drop constraint if exists site_settings_banner_window_order,
  add constraint site_settings_banner_window_order
    check (banner_starts_at is null or banner_ends_at is null or banner_ends_at > banner_starts_at);
