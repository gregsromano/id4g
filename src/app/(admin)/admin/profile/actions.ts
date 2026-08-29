"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/admin-dal";
import {
  getAdminUserByEmailWithHash,
  isValidNewPassword,
  updateAdminAvatar,
  updateAdminEmail,
  updateAdminPassword,
  verifyPasswordHash,
} from "@/lib/admin-users";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Profile mutations for the signed-in admin's own account.
 *
 * Every action calls `requireAdminUser()` first — a page-level session check
 * does NOT cover these: server actions are reachable by direct POST no matter
 * which page defined them. Both actions also re-verify the CURRENT password
 * before changing anything, the same way any account settings page would —
 * a session cookie alone (e.g. left signed in on a shared computer) should
 * not be enough to take over the account.
 */

const MAX_EMAIL_LENGTH = 320;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ProfileActionResult = { error: string } | { ok: true };

export async function updateEmailAction(
  _prev: ProfileActionResult | null,
  formData: FormData,
): Promise<ProfileActionResult> {
  const user = await requireAdminUser();

  const newEmail = String(formData.get("email") ?? "").trim().slice(0, MAX_EMAIL_LENGTH);
  const currentPassword = String(formData.get("current_password") ?? "");

  if (!EMAIL_RE.test(newEmail)) {
    return { error: "Enter a valid email address." };
  }

  const withHash = await getAdminUserByEmailWithHash(user.email);
  if (!withHash || !verifyPasswordHash(currentPassword, withHash.passwordHash)) {
    return { error: "Current password is incorrect." };
  }

  if (newEmail.toLowerCase() !== user.email.toLowerCase()) {
    const existing = await getAdminUserByEmailWithHash(newEmail);
    if (existing) {
      return { error: "That email is already in use." };
    }
  }

  await updateAdminEmail(user.id, newEmail);
  revalidatePath("/admin/profile");
  return { ok: true };
}

export async function updatePasswordAction(
  _prev: ProfileActionResult | null,
  formData: FormData,
): Promise<ProfileActionResult> {
  const user = await requireAdminUser();

  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  const withHash = await getAdminUserByEmailWithHash(user.email);
  if (!withHash || !verifyPasswordHash(currentPassword, withHash.passwordHash)) {
    return { error: "Current password is incorrect." };
  }

  if (!isValidNewPassword(newPassword)) {
    return { error: "New password must be at least 8 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation don't match." };
  }

  await updateAdminPassword(user.id, newPassword);
  revalidatePath("/admin/profile");
  return { ok: true };
}

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * Upload a new profile photo.
 *
 * Unlike the email/password actions this does NOT re-ask for the current
 * password: a photo is cosmetic and reversible, so the session cookie is
 * proportionate here, whereas changing the credentials themselves is what an
 * attacker on an unlocked machine would actually want.
 *
 * The old file is deliberately left in Storage — same reasoning as the
 * lifestyle images: it is cheap, and a stale URL may still sit in a cached
 * page. The row always points at the current one.
 */
export async function uploadAvatarAction(
  _prev: ProfileActionResult | null,
  formData: FormData,
): Promise<ProfileActionResult> {
  const user = await requireAdminUser();

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image file." };
  }
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return { error: "Only PNG, JPEG, or WEBP images are allowed." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Image is larger than 4MB." };
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `avatars/${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error } = await getSupabaseAdmin()
    .storage.from("images")
    .upload(path, file, { contentType: file.type });

  if (error) {
    console.error("[profile] avatar upload failed", { message: error.message });
    return { error: "Upload failed. Try again." };
  }

  const { data } = getSupabaseAdmin().storage.from("images").getPublicUrl(path);
  await updateAdminAvatar(user.id, data.publicUrl);

  // The photo renders in the admin header, which is part of every admin page,
  // so revalidate the layout's routes rather than just this one.
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function removeAvatarAction(): Promise<void> {
  const user = await requireAdminUser();
  await updateAdminAvatar(user.id, null);
  revalidatePath("/admin", "layout");
}
