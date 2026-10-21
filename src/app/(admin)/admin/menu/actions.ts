"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-dal";
import { NAV_ITEM_IDS } from "@/lib/nav-links";
import { getSiteSettings, setHiddenNavItems } from "@/lib/settings";

export type MenuItemState = { error: string } | { ok: true } | null;

/**
 * Show or hide one storefront menu item.
 *
 * `requireAdmin()` first, like every other admin action — a page-level
 * session check does NOT cover server actions, which are reachable by direct
 * POST no matter which page declared them. Takes one item rather than the
 * whole list so two quick clicks can't overwrite each other with stale
 * client state; the id is checked against NAV_LINKS so nothing arbitrary
 * gets stored.
 */
export async function setMenuItemHiddenAction(
  id: string,
  hidden: boolean,
): Promise<MenuItemState> {
  await requireAdmin();

  if (!NAV_ITEM_IDS.includes(id)) return { error: "Unknown menu item." };

  try {
    const { hiddenNavItems } = await getSiteSettings();
    const next = new Set(hiddenNavItems.filter((item) => NAV_ITEM_IDS.includes(item)));
    if (hidden) next.add(id);
    else next.delete(id);
    await setHiddenNavItems([...next]);
  } catch {
    return { error: "Could not save that. Try again." };
  }

  // The header and footer live in the storefront layout, so every store page
  // needs refreshing, not just the homepage.
  revalidatePath("/", "layout");
  revalidatePath("/admin/menu");
  return { ok: true };
}
