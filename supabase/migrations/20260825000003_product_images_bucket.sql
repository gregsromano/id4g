-- Storage bucket for admin-uploaded product images.
--
-- Created via migration (not only local config.toml) so a hosted project
-- gets the bucket through the same `db push` history as every other schema
-- change, rather than a manual dashboard step.
--
-- Public read: product photos are meant to be shown on the public storefront,
-- so there is no confidentiality reason to sign URLs. Writes are still
-- effectively restricted — the only writer is the service-role client inside
-- an admin server action (requireAdmin() gate), which bypasses bucket RLS
-- entirely, so no storage policies are needed for the write path either.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images',
  'images',
  true,
  8388608, -- 8MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;
