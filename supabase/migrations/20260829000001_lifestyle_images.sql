-- Lifestyle (lookbook) images.
--
-- The storefront's Lifestyle section was five hardcoded <Image> tags pointing
-- at files in public/, so adding or reordering a shot meant a code change and
-- a deploy. This table makes the section admin-managed like the product
-- catalog.
--
-- One row per image rather than a jsonb array on some settings row: unlike
-- products.images (which belongs to its product and is always read as a whole),
-- these are a standalone collection that grows over time and is paginated on
-- the storefront, so individual rows are what get inserted, reordered, and
-- deleted.
--
-- `position` follows the same convention as products.position: lower shows
-- first, and "the end" is assigned in application code at insert time since it
-- depends on what already exists.
create table if not exists lifestyle_images (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  alt text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists lifestyle_images_position_idx on lifestyle_images (position);

-- Same trust model as products/orders: the anon key is public, so every
-- read/write goes through the service-role client (server-only), which
-- bypasses RLS. This denies anon/authenticated entirely.
alter table lifestyle_images enable row level security;
alter table lifestyle_images force row level security;

-- Seed the five images the section already shipped with, preserving their
-- existing mosaic order and alt text. These live in public/ and are served
-- from the app origin rather than Supabase Storage; the app treats url as
-- opaque, so a root-relative path and a storage URL both work. Uploads added
-- later go to Storage.
--
-- Guarded so re-running against a database that already has rows cannot
-- duplicate the seed.
insert into lifestyle_images (url, alt, position)
select * from (values
  ('/lifestyle-alleyway.png',      'BROK3N tee worn in a city alleyway at night', 1),
  ('/lifestyle-studio-seated.png', 'BROK3N tee in a studio portrait',             2),
  ('/lifestyle-escalade.png',      'BROK3N tee worn against a city skyline',      3),
  ('/lifestyle-street-race.png',   'BROK3N tee worn on the street at night',      4),
  ('/lifestyle-studio-full.png',   'BROK3N tee, full-length studio shot',         5)
) as seed(url, alt, position)
where not exists (select 1 from lifestyle_images);
