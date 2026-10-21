-- Menu items the admin has switched off in /admin/menu.
--
-- Stores the stable ids from NAV_LINKS (src/lib/nav-links.ts), not labels or
-- hrefs, so renaming "About Greg Romano" or moving a page doesn't silently
-- un-hide it. An array on the settings singleton rather than a table: the menu
-- is a short, code-defined list and only ever read and written whole.
--
-- Default empty, so applying this migration hides nothing and the live menu
-- is unchanged until an item is deliberately switched off.
alter table site_settings
  add column if not exists hidden_nav_items text[] not null default '{}';
