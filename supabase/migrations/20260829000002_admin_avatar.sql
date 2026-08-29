-- Profile photo for admin accounts.
--
-- Nullable with no default: an account without a photo is the normal starting
-- state, not an error, and the UI falls back to the account's initial. Storing
-- the public URL (not the storage path) matches how products.images and
-- lifestyle_images.url already work, so every image consumer in the app reads
-- the same shape.
--
-- The file itself goes in the existing public `images` bucket under avatars/,
-- written only by the service-role client inside a requireAdminUser() gate.
alter table admin_users
  add column if not exists avatar_url text;
