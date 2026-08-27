-- Optional SEO overrides for the storefront <title>/meta description.
--
-- Both nullable, no default: blank means "fall back to the product name /
-- description at render time" (see generateMetadata in
-- src/app/(store)/products/[slug]/page.tsx), not "empty string is the
-- literal title."
alter table products
  add column if not exists meta_title text,
  add column if not exists meta_description text;
