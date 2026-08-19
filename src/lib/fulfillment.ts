import { PRODUCT, type Size } from "./product";

/**
 * Fulfillment vocabulary for the admin dashboard.
 *
 * Kept separate from `product.ts` because that module is imported by the
 * client-side cart; nothing here needs to ship to the browser with the store.
 * This file stays pure (no server-only imports) so the admin UI can use it in
 * both server and client components.
 */

/**
 * The full order lifecycle. This list is mirrored by the `orders_status_check`
 * constraint in the database — change one and you must change the other.
 *
 * pending   — row default; not written by any current code path
 * paid      — set by the Stripe webhook once checkout completes
 * fulfilled — shipped, set from the dashboard or a tracking import
 * cancelled — manually voided
 */
export const ORDER_STATUSES = [
  "pending",
  "paid",
  "fulfilled",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Orders still needing action — the dashboard's default queue. */
export const OPEN_STATUSES: OrderStatus[] = ["pending", "paid"];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Shipping weight estimates, used for the "Weight (oz)" column of the Pirate
 * Ship export.
 *
 * These are ESTIMATES for a single blank cotton tee (~5.5-6.5oz depending on
 * size) plus a poly mailer. True them up against a real scale after the first
 * batch of labels: under-declaring weight gets the package hit with a USPS
 * postage-due adjustment after the fact, which costs more than the postage.
 */
export const UNIT_WEIGHT_OZ = 6;
export const PACKAGING_WEIGHT_OZ = 2;

/** A single line of the `items` jsonb column. */
export type OrderItem = {
  size: Size;
  quantity: number;
};

export function orderWeightOz(items: OrderItem[]): number {
  const units = items.reduce((sum, item) => sum + item.quantity, 0);
  if (units === 0) return 0;
  return PACKAGING_WEIGHT_OZ + units * UNIT_WEIGHT_OZ;
}

/** Total unit count for an order. */
export function orderUnitCount(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Defensively parse the `items` jsonb column.
 *
 * Rows written before migration 20260728000002 have `items = null` and carry
 * only the legacy single `size` column, so callers pass that as a fallback.
 * Never throws: one malformed row must not blank out the whole dashboard.
 */
export function parseItems(raw: unknown, legacySize?: string | null): OrderItem[] {
  if (Array.isArray(raw)) {
    const parsed: OrderItem[] = [];
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const { size, quantity } = entry as { size?: unknown; quantity?: unknown };
      if (!PRODUCT.sizes.includes(size as Size)) continue;
      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty < 1) continue;
      parsed.push({ size: size as Size, quantity: qty });
    }
    if (parsed.length > 0) return parsed;
  }

  // Legacy single-size order.
  if (PRODUCT.sizes.includes(legacySize as Size)) {
    return [{ size: legacySize as Size, quantity: 1 }];
  }

  return [];
}

/** Rebuild the "M x1, L x2" summary for rows where `items_summary` is null. */
export function itemsSummaryFrom(items: OrderItem[]): string {
  return items.map(({ size, quantity }) => `${size} x${quantity}`).join(", ");
}

/**
 * Units per size across a set of orders. Every size is present (zeroed) so a
 * size with no open orders renders as "0" rather than disappearing from the
 * packing list.
 */
export function sizeBreakdown(orders: { items: OrderItem[] }[]): Record<Size, number> {
  const breakdown = Object.fromEntries(
    PRODUCT.sizes.map((size) => [size, 0]),
  ) as Record<Size, number>;

  for (const order of orders) {
    for (const { size, quantity } of order.items) {
      breakdown[size] += quantity;
    }
  }
  return breakdown;
}

/**
 * The admin-facing shape of an order. Built explicitly rather than spreading a
 * `select("*")` so a future column can't leak into the client by accident.
 */
export type AdminOrder = {
  id: string;
  stripeSessionId: string;
  customerEmail: string | null;
  customerName: string | null;
  shippingName: string | null;
  shippingAddress: ShippingAddress | null;
  amountTotal: number | null;
  /** Null on orders recorded before tax was stored separately — not zero. */
  amountTax: number | null;
  amountSubtotal: number | null;
  status: OrderStatus;
  items: OrderItem[];
  itemsSummary: string;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  adminNotes: string | null;
  createdAt: string;
  fulfilledAt: string | null;
};

/** Stripe's address object, as stored in the `shipping_address` jsonb column. */
export type ShippingAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

export function formatAddressLines(address: ShippingAddress | null): string[] {
  if (!address) return [];
  const cityLine = [address.city, address.state, address.postal_code]
    .filter(Boolean)
    .join(", ");
  return [address.line1, address.line2, cityLine, address.country].filter(
    (line): line is string => Boolean(line && line.trim()),
  );
}
