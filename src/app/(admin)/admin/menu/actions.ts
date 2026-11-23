"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-dal";
import { NAV_ITEM_IDS } from "@/lib/nav-links";
import { isBannerFont, isBannerSize, normalizeHex } from "@/lib/banner-style";
import {
  getSiteSettings,
  MAX_BANNER_LENGTH,
  setAnnouncementBanner,
  setBannerEnabled,
  setHiddenNavItems,
} from "@/lib/settings";

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


export type BannerState = { error: string } | { ok: true } | null;

function parseIso(value: FormDataEntryValue | null): string | null | "invalid" {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? "invalid" : new Date(ms).toISOString();
}

/**
 * Save or clear the announcement banner. Empty text clears it, dates
 * included. The dates arrive as exact ISO moments — BannerForm converts what
 * Greg typed in his own timezone before submitting.
 */
export async function saveBannerAction(_prev: BannerState, formData: FormData): Promise<BannerState> {
  await requireAdmin();

  const text = String(formData.get("text") ?? "").trim().replace(/\s+/g, " ");
  if (text.length > MAX_BANNER_LENGTH) {
    return { error: `Keep it under ${MAX_BANNER_LENGTH} characters.` };
  }

  const startsAt = text ? parseIso(formData.get("starts_at")) : null;
  const endsAt = text ? parseIso(formData.get("ends_at")) : null;
  if (startsAt === "invalid" || endsAt === "invalid") return { error: "That date isn't valid." };
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    return { error: "The banner has to end after it starts." };
  }

  const bgColor = normalizeHex(String(formData.get("bg_color") ?? ""));
  const textColor = normalizeHex(String(formData.get("text_color") ?? ""));
  if (!bgColor || !textColor) return { error: "Colors must be hex codes like #24E0FF." };
  const size = formData.get("font_size");
  const font = formData.get("font");
  if (!isBannerSize(size) || !isBannerFont(font)) return { error: "Pick a font and size." };

  try {
    const { banner } = await getSiteSettings();
    await setAnnouncementBanner({
      text: text || null,
      startsAt,
      endsAt,
      enabled: banner.enabled,
      style: { bgColor, textColor, bold: formData.get("bold") === "on", size, font },
    });
  } catch {
    return { error: "Could not save that. Try again." };
  }

  // The banner lives in the storefront layout, so every store page changes.
  revalidatePath("/", "layout");
  revalidatePath("/admin/menu");
  return { ok: true };
}

/** The banner's on/off switch — saves on its own, like the other admin switches. */
export async function setBannerEnabledAction(enabled: boolean): Promise<BannerState> {
  await requireAdmin();

  try {
    await setBannerEnabled(enabled);
  } catch {
    return { error: "Could not save that. Try again." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/menu");
  return { ok: true };
}
