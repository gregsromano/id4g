"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-dal";
import {
  appendLifestyleImages,
  removeLifestyleImage,
  reorderLifestyleImages,
  updateLifestyleAlt,
} from "@/lib/lifestyle";
import { setRandomizeLifestyle } from "@/lib/settings";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Server actions for the admin lifestyle gallery.
 *
 * Every action calls `requireAdmin()` first — a page-level session check does
 * NOT cover these: server actions are reachable by direct POST no matter which
 * page declared them (same note as products/actions.ts).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The 8MB per-file ceiling lives in AddLifestyleTile, not here: the file
// never reaches this server any more (browser -> Supabase with a signed
// token), so the only checks that can stop an oversized upload are the
// client's, for a friendly message, and the bucket's own file_size_limit.
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_ALT_LENGTH = 300;

/**
 * The gallery renders on the homepage and on its own admin page, so both are
 * revalidated after every mutation.
 */
function revalidateLifestyle() {
  revalidatePath("/admin/lifestyle");
  revalidatePath("/");
}

export type UploadLifestyleResult = { ok: boolean; message: string };

export type SignedLifestyleUpload =
  | { ok: true; path: string; token: string }
  | { ok: false; message: string };

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Mint a one-file signed upload token so the BROWSER can PUT straight to
 * Supabase Storage, never routing the bytes through a server action.
 *
 * Same hard ceiling as product media: **Vercel caps a function request body
 * at 4.5MB** (413 FUNCTION_PAYLOAD_TOO_LARGE), and that limit is
 * infrastructure-level — `serverActions.bodySizeLimit` can only lower it, so
 * no config makes a bigger file fit. This upload used to POST the file
 * itself and allowed 8MB, so every lookbook photo between 4.5MB and 8MB
 * passed our own validation and then failed as an unhandled 413, which the
 * admin sees as "This page couldn't load". Only the token crosses the
 * function boundary now, so the request stays kilobytes.
 *
 * Size is not checkable here (there is no file yet) — the bucket's own
 * file_size_limit is what actually rejects an oversized upload, server-side,
 * at the moment of the PUT.
 */
export async function createLifestyleUploadUrl(
  contentType: string,
): Promise<SignedLifestyleUpload> {
  await requireAdmin();

  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return { ok: false, message: "Only PNG, JPEG, or WEBP images are allowed." };
  }

  const path = `lifestyle/${crypto.randomUUID()}.${EXTENSION_BY_TYPE[contentType]}`;

  const { data, error } = await getSupabaseAdmin()
    .storage.from("images")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return { ok: false, message: `Could not start upload (${error?.message ?? "unknown"}).` };
  }

  return { ok: true, path: data.path, token: data.token };
}

/**
 * Record a file the browser already PUT to storage.
 *
 * Verifies the object EXISTS before writing the row rather than trusting the
 * client: the PUT happens outside this server's sight, so a failed or forged
 * upload would otherwise leave a gallery row pointing at a 404, which renders
 * as a broken tile on the live homepage.
 */
export async function attachLifestyleUpload(
  path: string,
  alt: string,
): Promise<UploadLifestyleResult> {
  await requireAdmin();

  // Must be a path we handed out — never a client-supplied path elsewhere in
  // the bucket (product folders, say).
  if (!path.startsWith("lifestyle/")) {
    return { ok: false, message: "Invalid upload path." };
  }

  const slash = path.lastIndexOf("/");
  const { data: listed, error: listError } = await getSupabaseAdmin()
    .storage.from("images")
    .list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 });

  if (listError) return { ok: false, message: `Could not verify upload (${listError.message}).` };
  if (!listed || listed.length === 0) {
    return { ok: false, message: "Upload did not complete — nothing was stored." };
  }

  const { data } = getSupabaseAdmin().storage.from("images").getPublicUrl(path);
  // Alt defaults to the filename so the field is never empty on arrival;
  // the admin edits it to something descriptive and saves.
  await appendLifestyleImages([{ url: data.publicUrl, alt: alt.slice(0, MAX_ALT_LENGTH) }]);
  revalidateLifestyle();

  return { ok: true, message: "Uploaded." };
}

/**
 * Save the gallery: order (from the hidden `image_id` fields, in DOM order)
 * and every alt text, in one submit.
 *
 * Order and alt text are paired positionally — `getAll` preserves document
 * order for both — so a mismatched count means the form was tampered with or
 * built wrong, and is rejected rather than silently writing alt text onto the
 * wrong rows.
 */
export async function saveLifestyleGallery(formData: FormData): Promise<void> {
  await requireAdmin();

  const ids = formData.getAll("image_id").map(String);
  const alts = formData.getAll("image_alt").map(String);

  if (ids.length !== alts.length) {
    throw new Error("Malformed lifestyle gallery submission");
  }
  for (const id of ids) {
    if (!UUID_RE.test(id)) throw new Error("Invalid lifestyle image id");
  }

  await reorderLifestyleImages(ids);

  for (const [i, id] of ids.entries()) {
    await updateLifestyleAlt(id, alts[i].slice(0, MAX_ALT_LENGTH).trim());
  }

  revalidateLifestyle();
}

/**
 * Persist ONLY the display order, for the reorder controls to call
 * immediately after a move.
 *
 * Deliberately does not touch alt text, even though saveLifestyleGallery
 * writes both: a reorder is one unambiguous action the admin just took, while
 * the alt fields may hold half-typed captions. Auto-committing those on an
 * arrow tap would save work the admin had not finished. Alt text stays on the
 * explicit Save button.
 */
export async function reorderLifestyleAction(orderedIds: string[]): Promise<void> {
  await requireAdmin();

  for (const id of orderedIds) {
    if (!UUID_RE.test(id)) throw new Error("Invalid lifestyle image id");
  }

  await reorderLifestyleImages(orderedIds);
  revalidateLifestyle();
}

/**
 * Remove one image.
 *
 * The id arrives as a BOUND argument, not a form field: React replaces a
 * submit button's `name` with its own $ACTION_ID_… when the button carries a
 * `formAction` server action, so name/value never survives the round trip.
 * Binding is also stricter — the id is fixed when the button renders rather
 * than read from whatever the submitted form happened to contain.
 */
export async function removeLifestyleImageAction(id: string): Promise<void> {
  await requireAdmin();
  if (!UUID_RE.test(id)) throw new Error("Invalid lifestyle image id");

  await removeLifestyleImage(id);
  revalidateLifestyle();
}

export type RandomizeLifestyleState = { error: string } | { ok: true } | null;

/**
 * Toggle the homepage lookbook shuffle.
 *
 * Separate from the products toggle so either gallery can be shuffled while
 * the other keeps its manual order.
 */
export async function setRandomizeLifestyleAction(
  enabled: boolean,
): Promise<RandomizeLifestyleState> {
  await requireAdmin();

  try {
    await setRandomizeLifestyle(enabled);
  } catch {
    return { error: "Could not save that. Try again." };
  }

  revalidateLifestyle();
  return { ok: true };
}
