"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-dal";
import {
  createDiscountCode,
  parsePercentOff,
  setDiscountCodeActive,
} from "@/lib/discounts";

/**
 * Server actions for discount codes.
 *
 * Every action calls `requireAdmin()` first — a page-level session check does
 * NOT cover these: server actions are reachable by direct POST no matter which
 * page declared them (same note as admin/actions.ts and products/actions.ts).
 * That matters more here than elsewhere: an unauthenticated caller who could
 * reach these would be able to mint themselves a 100%-off code.
 */

/** Stripe promotion code ids, e.g. `promo_1AbC…`. */
const PROMO_ID_RE = /^promo_[A-Za-z0-9]+$/;

export type CreateDiscountState = { error: string } | { ok: true } | null;

export async function createDiscountAction(
  _prev: CreateDiscountState,
  formData: FormData,
): Promise<CreateDiscountState> {
  await requireAdmin();

  const code = String(formData.get("code") ?? "");
  const percentOff = parsePercentOff(String(formData.get("percentOff") ?? ""));

  if (!code.trim()) return { error: "Enter a code." };
  if (percentOff === null) {
    return { error: "Enter a whole percentage between 1 and 100." };
  }

  const result = await createDiscountCode(code, percentOff);
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/discounts");
  return { ok: true };
}

/**
 * Toggle a code on or off.
 *
 * The id is bound into the action rather than read from a form field: React
 * REPLACES a submit button's `name` with its own `$ACTION_ID_…` when the
 * button carries a `formAction` server action, so `name`/`value` never reach
 * the server. That bug cost a live crash on this project once already.
 */
export async function setDiscountActiveAction(
  promotionCodeId: string,
  active: boolean,
): Promise<void> {
  await requireAdmin();

  if (!PROMO_ID_RE.test(promotionCodeId)) {
    throw new Error("Invalid discount id");
  }

  await setDiscountCodeActive(promotionCodeId, active);
  revalidatePath("/admin/discounts");
}
