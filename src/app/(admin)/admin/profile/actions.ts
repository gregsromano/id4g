"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/admin-dal";
import {
  getAdminUserByEmailWithHash,
  isValidNewPassword,
  updateAdminEmail,
  updateAdminPassword,
  verifyPasswordHash,
} from "@/lib/admin-users";

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
