"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-dal";
import { setEmailPopupEnabled } from "@/lib/settings";

/**
 * Server action for the email popup switch.
 *
 * `requireAdmin()` first, like every other admin action — a page-level
 * session check does NOT cover server actions, which are reachable by direct
 * POST no matter which page declared them.
 */
export type EmailPopupState = { error: string } | { ok: true } | null;

export async function setEmailPopupAction(enabled: boolean): Promise<EmailPopupState> {
  await requireAdmin();

  try {
    await setEmailPopupEnabled(enabled);
  } catch {
    return { error: "Could not save that. Try again." };
  }

  // The storefront reads this on every render and this page shows the
  // current state, so both have to be refreshed.
  revalidatePath("/");
  revalidatePath("/admin/email");
  return { ok: true };
}
