"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-dal";
import {
  appendLifestyleImages,
  removeLifestyleImage,
  reorderLifestyleImages,
  updateLifestyleAlt,
} from "@/lib/lifestyle";
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

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
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

export async function uploadLifestyleImages(
  _prev: UploadLifestyleResult | null,
  formData: FormData,
): Promise<UploadLifestyleResult> {
  await requireAdmin();

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return { ok: false, message: "Choose at least one image file." };
  }

  const uploaded: { url: string; alt: string }[] = [];

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return { ok: false, message: `${file.name}: only PNG, JPEG, or WEBP images are allowed.` };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { ok: false, message: `${file.name}: file is larger than 8MB.` };
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `lifestyle/${crypto.randomUUID()}.${ext}`;

    const { error } = await getSupabaseAdmin()
      .storage.from("images")
      .upload(path, file, { contentType: file.type });

    if (error) {
      return { ok: false, message: `${file.name}: upload failed (${error.message}).` };
    }

    const { data } = getSupabaseAdmin().storage.from("images").getPublicUrl(path);
    // Alt defaults to the filename so the field is never empty on arrival;
    // the admin edits it to something descriptive and saves.
    uploaded.push({ url: data.publicUrl, alt: file.name });
  }

  await appendLifestyleImages(uploaded);
  revalidateLifestyle();

  return { ok: true, message: `Uploaded ${uploaded.length} image${uploaded.length === 1 ? "" : "s"}.` };
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
