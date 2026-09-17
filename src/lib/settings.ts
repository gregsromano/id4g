import "server-only";

import { assertServiceRoleConfigured, getSupabaseAdmin } from "./supabase";

/**
 * Site-wide storefront settings.
 *
 * Backed by a single row in `site_settings` with a fixed id (see the
 * migration for why single-row-with-a-check-constraint rather than a
 * key/value table). RLS is enabled and FORCED with no policies, so reads and
 * writes go through the service-role client — `server-only` turns an
 * accidental client import into a build error, matching products.ts and
 * admin-orders.ts.
 */

/** The one and only settings row. */
const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

export type SiteSettings = {
  /** Shuffle the storefront product grid on every request. */
  randomizeProducts: boolean;
  /**
   * Product held in first place while the shuffle is on; the rest are
   * shuffled below it. Null means the shuffle covers everything.
   *
   * Only meaningful when `randomizeProducts` is true — with the shuffle off,
   * the manual `position` order already decides what comes first.
   */
  pinnedProductId: string | null;
};

/**
 * Falls back to the shipped defaults rather than throwing.
 *
 * This is read on every storefront render, so a settings failure must not be
 * able to take the shop page down: the catalog is the point of the page and
 * the setting only decides what order it is in. Losing the row degrades to
 * the manual order, which is the same thing a fresh install does.
 */
const DEFAULTS: SiteSettings = { randomizeProducts: false, pinnedProductId: null };

export async function getSiteSettings(): Promise<SiteSettings> {
  assertServiceRoleConfigured();

  const { data, error } = await getSupabaseAdmin()
    .from("site_settings")
    .select("randomize_products, pinned_product_id")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error || !data) return DEFAULTS;

  const row = data as { randomize_products: boolean; pinned_product_id: string | null };

  return {
    randomizeProducts: Boolean(row.randomize_products),
    pinnedProductId: row.pinned_product_id ?? null,
  };
}

/**
 * Writes are admin-only; callers gate with `requireAdmin()` first.
 *
 * Upserts rather than updates so a database whose seed insert never ran
 * still ends up with the setting the admin just chose, instead of silently
 * accepting a click that changed nothing.
 */
export async function setPinnedProduct(productId: string | null): Promise<void> {
  assertServiceRoleConfigured();

  const { error } = await getSupabaseAdmin()
    .from("site_settings")
    .upsert(
      {
        id: SETTINGS_ID,
        pinned_product_id: productId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) {
    console.error("[settings] failed to save pinned_product_id", {
      message: error.message,
    });
    throw new Error("Failed to save setting");
  }
}

export async function setRandomizeProducts(enabled: boolean): Promise<void> {
  assertServiceRoleConfigured();

  const { error } = await getSupabaseAdmin()
    .from("site_settings")
    .upsert(
      {
        id: SETTINGS_ID,
        randomize_products: enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) {
    console.error("[settings] failed to save randomize_products", {
      message: error.message,
    });
    throw new Error("Failed to save setting");
  }
}
