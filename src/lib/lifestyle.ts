import "server-only";

import { assertServiceRoleConfigured, getSupabaseAdmin } from "./supabase";

export { LIFESTYLE_PAGE_SIZE } from "./lifestyle-constants";

/**
 * Lifestyle (lookbook) image reads/writes.
 *
 * RLS is enabled and FORCED on `lifestyle_images` with no policies, so every
 * query here goes through the service-role client, which bypasses RLS. That
 * key must never reach the browser — `server-only` turns an accidental client
 * import into a build error. Same conventions as products.ts: explicit column
 * lists (never `select("*")`), a row->domain mapper, and a `fail()` helper
 * that logs the real error server-side but never leaks it to the client.
 */

export type LifestyleImage = {
  id: string;
  url: string;
  alt: string;
  position: number;
};

type Row = {
  id: string;
  url: string;
  alt: string | null;
  position: number;
};

const COLUMNS = "id, url, alt, position";

function toImage(row: Row): LifestyleImage {
  return {
    id: row.id,
    url: row.url,
    alt: row.alt ?? "",
    position: row.position,
  };
}

function fail(context: string, error: { code?: string; message?: string }): never {
  console.error(`[lifestyle] ${context}`, {
    code: error.code,
    message: error.message,
  });
  throw new Error(`Failed to ${context}`);
}

/**
 * Every image in display order.
 *
 * `created_at` is a tiebreaker so rows sharing a position (possible after a
 * partial reorder) still come back in a stable order rather than whatever
 * Postgres happens to return.
 */
export async function listLifestyleImages(): Promise<LifestyleImage[]> {
  assertServiceRoleConfigured();

  const { data, error } = await getSupabaseAdmin()
    .from("lifestyle_images")
    .select(COLUMNS)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) fail("list lifestyle images", error);

  return (data as Row[]).map(toImage);
}

/**
 * Append uploads to the end of the current order.
 *
 * "The end" is computed here rather than by a DB default because it depends
 * on what already exists — same reasoning as products.position.
 */
export async function appendLifestyleImages(
  images: { url: string; alt: string }[],
): Promise<void> {
  if (images.length === 0) return;
  assertServiceRoleConfigured();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("lifestyle_images")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);

  if (error) fail("find last lifestyle position", error);

  const rows = data as { position: number }[];
  const start = rows.length > 0 ? rows[0].position + 1 : 1;

  const { error: insertError } = await supabase.from("lifestyle_images").insert(
    images.map((img, i) => ({
      url: img.url,
      alt: img.alt,
      position: start + i,
    })),
  );

  if (insertError) fail("insert lifestyle images", insertError);
}

/** Update the alt text of a single image. */
export async function updateLifestyleAlt(id: string, alt: string): Promise<void> {
  assertServiceRoleConfigured();

  const { error } = await getSupabaseAdmin()
    .from("lifestyle_images")
    .update({ alt })
    .eq("id", id);

  if (error) fail("update lifestyle alt text", error);
}

/**
 * Persist a new display order.
 *
 * Takes the full ordered list of ids and rewrites every position from it, so
 * the result is exactly what the admin dragged rather than a diff that could
 * drift. Ids not present in the table are ignored by the `eq` filter.
 *
 * Not a transaction: Supabase's REST client has no multi-statement
 * transaction, and the failure mode is benign — a partial reorder leaves the
 * gallery in a different order, not a broken state, and re-saving fixes it.
 */
export async function reorderLifestyleImages(orderedIds: string[]): Promise<void> {
  assertServiceRoleConfigured();
  const supabase = getSupabaseAdmin();

  for (const [index, id] of orderedIds.entries()) {
    const { error } = await supabase
      .from("lifestyle_images")
      .update({ position: index + 1 })
      .eq("id", id);

    if (error) fail("reorder lifestyle images", error);
  }
}

/**
 * Delete one image row.
 *
 * The underlying file in Storage is deliberately left in place: it is cheap,
 * and the row may be the only record of a URL that is still referenced by a
 * cached page or an external link. Orphan cleanup, if it ever matters, is a
 * separate deliberate job.
 */
export async function removeLifestyleImage(id: string): Promise<void> {
  assertServiceRoleConfigured();

  const { error } = await getSupabaseAdmin()
    .from("lifestyle_images")
    .delete()
    .eq("id", id);

  if (error) fail("remove lifestyle image", error);
}
