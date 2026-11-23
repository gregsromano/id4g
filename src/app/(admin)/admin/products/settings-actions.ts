"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-dal";
import { normalizeHex } from "@/lib/banner-style";
import { setPinnedProduct, setRandomizeProducts, setSaleBadgeColors } from "@/lib/settings";

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

export type PinnedState = { error: string } | { ok: true } | null;

/**
 * Pin a product to first place, or pass null to clear the pin.
 *
 * Only affects the storefront while the shuffle is on; with it off the
 * manual `position` order already decides what comes first.
 */
export async function setPinnedProductAction(
  productId: string | null,
): Promise<PinnedState> {
  await requireAdmin();

  try {
    await setPinnedProduct(productId);
  } catch {
    return { error: "Could not save that. Try again." };
  }

  revalidatePath("/");
  revalidatePath("/admin/products");
  return { ok: true };
}

export type SaleBadgeState = { error: string } | { ok: true } | null;

/** Colors for the SALE tag; validated as #rrggbb before they reach any style attribute. */
export async function saveSaleBadgeColorsAction(
  _prev: SaleBadgeState,
  formData: FormData,
): Promise<SaleBadgeState> {
  await requireAdmin();

  const bgColor = normalizeHex(String(formData.get("bg_color") ?? ""));
  const textColor = normalizeHex(String(formData.get("text_color") ?? ""));
  if (!bgColor || !textColor) return { error: "Colors must be hex codes like #24E0FF." };

  try {
    await setSaleBadgeColors({ bgColor, textColor });
  } catch {
    return { error: "Could not save that. Try again." };
  }

  // Every storefront page can show a SALE tag; the colors ride on the layout.
  revalidatePath("/", "layout");
  revalidatePath("/admin/products");
  return { ok: true };
}
