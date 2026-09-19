/**
 * Product media can be a photo or a short MP4 clip. Both live in the same
 * `products.images` jsonb array and the same storage bucket, so that ordering,
 * cover selection, alt text and removal keep working on a single list rather
 * than two parallel ones the admin would have to interleave by hand.
 *
 * Which one a given item is, is derived from its URL extension rather than
 * stored as a field. Every URL in that array is one this app uploaded and
 * named itself (`products/<id>/<uuid>.<ext>`), so the extension is reliable —
 * and deriving it means the hundreds of image rows already in production need
 * no backfill, and no row can ever carry a `kind` that disagrees with the file
 * it points at.
 */
const VIDEO_EXTENSIONS = [".mp4"];

export function isVideoUrl(url: string): boolean {
  // Strip any query string (Supabase public URLs are bare today, but a cache
  // buster appended later must not make a video read as an image and get
  // handed to next/image, which throws on a non-image).
  const path = url.split("?")[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => path.endsWith(ext));
}
