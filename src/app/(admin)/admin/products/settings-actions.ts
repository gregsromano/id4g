"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-dal";
import { setRandomizeProducts } from "@/lib/settings";

/**
 * Server action for the storefront ordering toggle.
 *
 * `requireAdmin()` first, like every other admin action — a page-level
 * session check does NOT cover server actions, which are reachable by direct
 * POST no matter which page declared them.
 *
 * Kept in its own file rather than products/actions.ts because that module is
 * the product CRUD surface; this writes site_settings and shares none of it.
 */
export type RandomizeState = { error: string } | { ok: true; enabled: boolean } | null;

export async function setRandomizeProductsAction(
  enabled: boolean,
): Promise<RandomizeState> {
  await requireAdmin();

  try {
    await setRandomizeProducts(enabled);
  } catch {
    return { error: "Could not save that. Try again." };
  }

  // The storefront reads this on every render, and the admin page shows the
  // current state, so both have to be refreshed.
  revalidatePath("/");
  revalidatePath("/admin/products");
  return { ok: true, enabled };
}
