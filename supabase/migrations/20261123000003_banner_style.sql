-- Look and on/off switch for the announcement banner, set in /admin/menu.
--
-- banner_enabled lets the banner be switched off without losing its text and
-- schedule. Defaults to true so a banner already set up keeps showing.
-- Colors are "#rrggbb" (validated in the app); null means the original
-- accent colors. Font and size are keys from src/lib/banner-style.ts.
-- Every default matches the banner's current look, so applying this changes
-- nothing on the live site.
alter table site_settings
  add column if not exists banner_enabled boolean not null default true,
  add column if not exists banner_bg_color text,
  add column if not exists banner_text_color text,
  add column if not exists banner_bold boolean not null default true,
  add column if not exists banner_font_size text not null default 'md',
  add column if not exists banner_font text not null default 'body';
