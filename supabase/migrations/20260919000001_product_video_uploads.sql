-- Allow MP4 video in the product media bucket.
--
-- The `images` bucket was created (20260825000003) for product photos only:
-- PNG/JPEG/WEBP at 8MB. Product media can now also be a short MP4 clip, so
-- the bucket has to accept `video/mp4` and a larger ceiling — a 15-30s phone
-- clip is tens of megabytes where a photo is under two.
--
-- 50MB is the cap, and it is enforced per-bucket here as well as in the
-- upload action. The bucket limit is the one that actually protects storage:
-- the action's check can only see what the browser reports, while this one
-- is applied by Storage itself on the write path.
--
-- The bucket keeps its `images` name. Renaming it would rewrite every public
-- URL already stored in products.images / lifestyle_images.url and break
-- every photo on the live site, which is a far worse trade than a slightly
-- inaccurate name.
--
-- MP4 only, deliberately. QuickTime .mov off an iPhone is usually HEVC,
-- which Chrome on Android and most Windows browsers refuse to play — it
-- would upload cleanly, look right to an admin on a Mac, and show a black
-- box to a share of real customers. There is no transcoding step available
-- on Vercel Hobby to normalize it, so the format is restricted instead.
update storage.buckets
set
  file_size_limit = 52428800, -- 50MB
  allowed_mime_types = array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'video/mp4'
  ]
where id = 'images';
