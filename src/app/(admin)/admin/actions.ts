"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-dal";
import { applyTrackingImport, deleteOrder, updateOrder } from "@/lib/admin-orders";
import { parseCsv } from "@/lib/csv";

/**
 * Mutations for the fulfillment dashboard.
 *
 * Every action calls `requireAdmin()` first. A page-level session check does
 * NOT cover these: server actions are reachable by direct POST no matter which
 * page declared them.
 *
 * Revalidation uses `revalidatePath`, not `revalidateTag`. Tags only attach to
 * `use cache` (disabled here — `cacheComponents` is off) or to tagged `fetch`
 * calls, and these reads go through the Supabase client instead.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_TRACKING_LENGTH = 64;
const MAX_NOTE_LENGTH = 2000;

function requireId(formData: FormData): string {
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) throw new Error("Invalid order id");
  return id;
}

function revalidateOrder(id: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/orders/${id}`);
}

/** Trim to null so "cleared" is distinguishable from "never set". */
function optionalText(value: FormDataEntryValue | null, maxLength: number) {
  const text = String(value ?? "").trim();
  if (text.length === 0) return null;
  return text.slice(0, maxLength);
}

export async function markFulfilled(formData: FormData) {
  await requireAdmin();
  const id = requireId(formData);

  await updateOrder(id, {
    status: "fulfilled",
    fulfilled_at: new Date().toISOString(),
    tracking_number: optionalText(formData.get("tracking_number"), MAX_TRACKING_LENGTH),
    tracking_carrier: optionalText(formData.get("tracking_carrier"), MAX_TRACKING_LENGTH),
  });

  revalidateOrder(id);
}

/**
 * Save tracking without changing status. Kept separate from fulfillment so a
 * mistyped number can be corrected without a status round-trip.
 */
export async function saveTracking(formData: FormData) {
  await requireAdmin();
  const id = requireId(formData);

  await updateOrder(id, {
    tracking_number: optionalText(formData.get("tracking_number"), MAX_TRACKING_LENGTH),
    tracking_carrier: optionalText(formData.get("tracking_carrier"), MAX_TRACKING_LENGTH),
  });

  revalidateOrder(id);
}

export async function saveNote(formData: FormData) {
  await requireAdmin();
  const id = requireId(formData);

  await updateOrder(id, {
    admin_notes: optionalText(formData.get("admin_notes"), MAX_NOTE_LENGTH),
  });

  revalidateOrder(id);
}

/** Undo a fulfillment — mis-clicks happen, and the alternative is Supabase. */
export async function unfulfill(formData: FormData) {
  await requireAdmin();
  const id = requireId(formData);

  await updateOrder(id, { status: "paid", fulfilled_at: null });

  revalidateOrder(id);
}

/**
 * Permanently removes an order — for cleaning up test/junk orders, not real
 * customer ones (see deleteOrder's own doc comment). The confirm() prompt
 * lives client-side (RemoveOrderButton) since this can't be undone.
 */
export async function removeOrder(formData: FormData) {
  await requireAdmin();
  const id = requireId(formData);

  await deleteOrder(id);

  revalidatePath("/admin");
}

export type ImportResult = {
  ok: boolean;
  message: string;
  updated: number;
  skipped: number;
  notFound: string[];
};

/**
 * Apply a Pirate Ship export CSV.
 *
 * Pirate Ship has no public API, so the loop is manual: export orders from
 * /api/admin/export, upload that file to Pirate Ship, buy labels, then export
 * from Pirate Ship's shipment grid and paste it here.
 *
 * The "Order ID" column we send is carried through Pirate Ship untouched (its
 * Passthrough feature), which is what makes this an exact match rather than a
 * fuzzy join on name or address. Header text is matched loosely because their
 * export column names are not contractually stable.
 */
export async function importTracking(
  _prev: ImportResult | null,
  formData: FormData,
): Promise<ImportResult> {
  await requireAdmin();

  const uploaded = formData.get("file");
  const pasted = String(formData.get("csv") ?? "");
  const text =
    uploaded instanceof File && uploaded.size > 0 ? await uploaded.text() : pasted;

  const empty = { updated: 0, skipped: 0, notFound: [] as string[] };

  if (!text.trim()) {
    return { ok: false, message: "Paste a CSV or choose a file first.", ...empty };
  }

  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { ok: false, message: "That CSV has no data rows.", ...empty };
  }

  const headers = rows[0].map((header) => header.trim());
  const findColumn = (pattern: RegExp) =>
    headers.findIndex((header) => pattern.test(header));

  const idIndex = findColumn(/order\s*id/i);
  const trackingIndex = findColumn(/tracking/i);
  const carrierIndex = findColumn(/carrier|service/i);

  if (idIndex === -1 || trackingIndex === -1) {
    // Name the headers actually seen — a blind "couldn't parse" here is
    // maddening to debug against a file you can't see.
    return {
      ok: false,
      message: `Could not find an "Order ID" and "Tracking" column. Columns found: ${headers.join(", ")}`,
      ...empty,
    };
  }

  const entries: { id: string; trackingNumber: string; carrier: string | null }[] = [];
  let skipped = 0;

  for (const row of rows.slice(1)) {
    const id = (row[idIndex] ?? "").trim();
    const trackingNumber = (row[trackingIndex] ?? "").trim();
    if (!UUID_RE.test(id) || !trackingNumber) {
      skipped += 1;
      continue;
    }
    entries.push({
      id,
      trackingNumber: trackingNumber.slice(0, MAX_TRACKING_LENGTH),
      carrier:
        carrierIndex === -1
          ? null
          : (row[carrierIndex] ?? "").trim().slice(0, MAX_TRACKING_LENGTH) || null,
    });
  }

  const { updated, notFound } = await applyTrackingImport(entries);

  revalidatePath("/admin");

  return {
    ok: true,
    message: `Updated ${updated} order${updated === 1 ? "" : "s"}.`,
    updated,
    skipped,
    notFound,
  };
}
