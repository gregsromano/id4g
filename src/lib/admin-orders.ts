import "server-only";

import { assertServiceRoleConfigured, getSupabaseAdmin } from "./supabase";
import { verifyAdminSession } from "./admin-dal";
import {
  OPEN_STATUSES,
  isOrderStatus,
  itemsSummaryFrom,
  orderUnitCount,
  parseItems,
  variantBreakdown,
  type AdminOrder,
  type OrderStatus,
  type ShippingAddress,
  type VariantBreakdownRow,
} from "./fulfillment";

/**
 * Server-side reads and writes of the orders table for the admin dashboard.
 *
 * RLS is enabled and FORCED on `orders` with no policies, so every query here
 * goes through the service-role client, which bypasses RLS. That key must
 * never reach the browser — `server-only` turns an accidental client import
 * into a build error.
 */

/**
 * Explicit column list. Never `select("*")`: a column added later (say, a raw
 * Stripe payload) would silently start flowing into the UI.
 */
const ORDER_COLUMNS = [
  "id",
  "stripe_session_id",
  "customer_email",
  "customer_name",
  "shipping_name",
  "shipping_address",
  "amount_total",
  "amount_tax",
  "amount_subtotal",
  "status",
  "size",
  "items",
  "items_summary",
  "tracking_number",
  "tracking_carrier",
  "admin_notes",
  "created_at",
  "fulfilled_at",
].join(", ");

type OrderRow = {
  id: string;
  stripe_session_id: string;
  customer_email: string | null;
  customer_name: string | null;
  shipping_name: string | null;
  shipping_address: ShippingAddress | null;
  amount_total: number | null;
  amount_tax: number | null;
  amount_subtotal: number | null;
  status: string;
  size: string | null;
  items: unknown;
  items_summary: string | null;
  tracking_number: string | null;
  tracking_carrier: string | null;
  admin_notes: string | null;
  created_at: string;
  fulfilled_at: string | null;
};

function toAdminOrder(row: OrderRow): AdminOrder {
  const items = parseItems(row.items, row.size);
  return {
    id: row.id,
    stripeSessionId: row.stripe_session_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    shippingName: row.shipping_name,
    shippingAddress: row.shipping_address,
    amountTotal: row.amount_total,
    amountTax: row.amount_tax,
    amountSubtotal: row.amount_subtotal,
    status: isOrderStatus(row.status) ? row.status : "paid",
    items,
    itemsSummary: row.items_summary ?? itemsSummaryFrom(items),
    trackingNumber: row.tracking_number,
    trackingCarrier: row.tracking_carrier,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    fulfilledAt: row.fulfilled_at,
  };
}

function fail(context: string, error: { code?: string; message?: string }): never {
  console.error(`[admin-orders] ${context}`, {
    code: error.code,
    message: error.message,
  });
  throw new Error(`Failed to ${context}`);
}

/**
 * PostgREST's `.or()` takes a comma-delimited mini-language, so raw user input
 * interpolated into it is a filter-injection vector. Strip the characters that
 * carry meaning there.
 */
function sanitizeSearch(term: string): string {
  return term.replace(/[,()%*\\]/g, "").trim().slice(0, 80);
}

export type OrderFilter = "open" | "fulfilled" | "all";

const MAX_LIMIT = 200;

export async function listOrders({
  filter = "open",
  search,
  limit = 100,
}: {
  filter?: OrderFilter;
  search?: string;
  limit?: number;
} = {}): Promise<AdminOrder[]> {
  await verifyAdminSession();
  assertServiceRoleConfigured();

  let query = getSupabaseAdmin()
    .from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, MAX_LIMIT));

  if (filter === "open") query = query.in("status", OPEN_STATUSES);
  if (filter === "fulfilled") query = query.eq("status", "fulfilled");

  const term = search ? sanitizeSearch(search) : "";
  if (term) {
    query = query.or(
      `customer_email.ilike.%${term}%,customer_name.ilike.%${term}%,shipping_name.ilike.%${term}%`,
    );
  }

  const { data, error } = await query;
  if (error) fail("list orders", error);

  return (data as unknown as OrderRow[]).map(toAdminOrder);
}

export async function getOrder(id: string): Promise<AdminOrder | null> {
  await verifyAdminSession();
  assertServiceRoleConfigured();

  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) fail("load order", error);
  if (!data) return null;

  return toAdminOrder(data as unknown as OrderRow);
}

export type FulfillmentSummary = {
  openOrders: number;
  unitsToShip: number;
  grossRevenueCents: number;
  taxCollectedCents: number;
  /** Orders with no recorded tax — predate the amount_tax column. */
  ordersMissingTax: number;
  variants: VariantBreakdownRow[];
};

export async function getFulfillmentSummary(): Promise<FulfillmentSummary> {
  await verifyAdminSession();
  assertServiceRoleConfigured();

  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select("status, amount_total, amount_tax, items, size")
    .in("status", OPEN_STATUSES);

  if (error) fail("summarize orders", error);

  const rows = (data ?? []) as unknown as Pick<
    OrderRow,
    "status" | "amount_total" | "amount_tax" | "items" | "size"
  >[];

  const parsed = rows.map((row) => ({ items: parseItems(row.items, row.size) }));

  return {
    openOrders: rows.length,
    unitsToShip: parsed.reduce((sum, row) => sum + orderUnitCount(row.items), 0),
    grossRevenueCents: rows.reduce((sum, row) => sum + (row.amount_total ?? 0), 0),
    taxCollectedCents: rows.reduce((sum, row) => sum + (row.amount_tax ?? 0), 0),
    ordersMissingTax: rows.filter((row) => row.amount_tax === null).length,
    variants: variantBreakdown(parsed),
  };
}

/** Orders for the Pirate Ship CSV export. */
export async function listOrdersForExport(
  filter: OrderFilter = "open",
): Promise<AdminOrder[]> {
  return listOrders({ filter, limit: MAX_LIMIT });
}

type OrderUpdate = {
  status?: OrderStatus;
  tracking_number?: string | null;
  tracking_carrier?: string | null;
  admin_notes?: string | null;
  fulfilled_at?: string | null;
};

export async function updateOrder(id: string, patch: OrderUpdate): Promise<void> {
  assertServiceRoleConfigured();

  const { error } = await getSupabaseAdmin()
    .from("orders")
    .update(patch)
    .eq("id", id);

  if (error) fail("update order", error);
}

/**
 * Permanently deletes an order row. Unlike products (archive-only, since
 * historical orders may reference a variant id), there's no snapshot
 * anywhere ELSE that depends on an order row continuing to exist — so a
 * genuine delete is safe here. Meant for cleaning up test/junk orders, not
 * for real customer orders (a real paid order should stay as a permanent
 * record — cancel it via status instead of deleting it).
 */
export async function deleteOrder(id: string): Promise<void> {
  assertServiceRoleConfigured();

  const { error } = await getSupabaseAdmin().from("orders").delete().eq("id", id);
  if (error) fail("delete order", error);
}

/**
 * Bulk-apply tracking numbers from a Pirate Ship export.
 *
 * `fulfilled_at` is only stamped on orders that are not already fulfilled, so
 * re-importing the same file is a clean no-op rather than rewriting ship dates.
 */
export async function applyTrackingImport(
  entries: { id: string; trackingNumber: string; carrier: string | null }[],
): Promise<{ updated: number; notFound: string[] }> {
  assertServiceRoleConfigured();

  const ids = entries.map((entry) => entry.id);
  if (ids.length === 0) return { updated: 0, notFound: [] };

  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select("id, status, fulfilled_at")
    .in("id", ids);

  if (error) fail("look up orders for tracking import", error);

  const existing = new Map(
    (data ?? []).map((row) => [
      (row as { id: string }).id,
      row as { id: string; status: string; fulfilled_at: string | null },
    ]),
  );

  const now = new Date().toISOString();
  let updated = 0;
  const notFound: string[] = [];

  for (const entry of entries) {
    const row = existing.get(entry.id);
    if (!row) {
      notFound.push(entry.id);
      continue;
    }

    await updateOrder(entry.id, {
      tracking_number: entry.trackingNumber,
      tracking_carrier: entry.carrier,
      status: "fulfilled",
      fulfilled_at: row.fulfilled_at ?? now,
    });
    updated += 1;
  }

  return { updated, notFound };
}
