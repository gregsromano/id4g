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
 * Fallback shipping weight estimate, used for the "Weight (oz)" column of the
 * Pirate Ship export when a line item has no per-product weight recorded
 * (either the product's `weight_oz` was left blank, or the order predates
 * per-product weight tracking).
 */
export const UNIT_WEIGHT_OZ = 6;
export const PACKAGING_WEIGHT_OZ = 2;

/**
 * A single line of the `items` jsonb column — a full point-of-sale snapshot
 * taken at checkout time, not a live reference to the catalog. This is what
 * lets an order keep rendering correctly forever even after its product is
 * edited or archived: nothing here is re-derived from the live `products`
 * table at read time.
 */
export type OrderItem = {
  productId: string;
  variantId: string;
  name: string;
  variantLabel: string;
  /** Null on legacy rows recorded before per-line pricing was stored. */
  unitPriceCents: number | null;
  unitWeightOz: number;
  quantity: number;
};

export function orderWeightOz(items: OrderItem[]): number {
  const units = items.reduce((sum, item) => sum + item.quantity, 0);
  if (units === 0) return 0;
  return (
    PACKAGING_WEIGHT_OZ +
    items.reduce((sum, item) => sum + item.quantity * item.unitWeightOz, 0)
  );
}

/** Total unit count for an order. */
export function orderUnitCount(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Historical values for the single product this store sold before the catalog
 * existed. Used only to synthesize a snapshot for orders written before this
 * migration — NOT a live catalog reference, so it must not be updated to track
 * ordinary product edits.
 *
 * The name is the one exception, changed once with the brand rename from
 * "I'll Die For The Gospel" to "I'm Down For The Gospel". That was a deliberate
 * call to keep old orders reading under the current brand rather than showing
 * customers a name that no longer exists anywhere else on the site.
 */
const LEGACY_PRODUCT_ID = "brok3n-tee";
const LEGACY_PRODUCT_NAME = "BROK3N Tee — I'm Down For The Gospel";
const LEGACY_SIZES = new Set(["S", "M", "L", "XL", "2XL", "3XL"]);

function legacyItem(size: string, quantity: number): OrderItem {
  return {
    productId: LEGACY_PRODUCT_ID,
    variantId: size,
    name: LEGACY_PRODUCT_NAME,
    variantLabel: `Size ${size}`,
    unitPriceCents: null,
    unitWeightOz: UNIT_WEIGHT_OZ,
    quantity,
  };
}

/**
 * Defensively parse the `items` jsonb column.
 *
 * Handles three generations of row shape:
 *  1. Current: {productId, variantId, name, variantLabel, unitPriceCents,
 *     unitWeightOz, quantity} — used as-is.
 *  2. Middle-generation (rows written before the catalog existed): jsonb
 *     items shaped as {size, quantity}, no productId — synthesized into a
 *     legacy snapshot.
 *  3. Oldest (pre-jsonb): `items` is null, only the legacy single `size`
 *     column exists — callers pass that column as `legacySize`.
 *
 * Never throws: one malformed row must not blank out the whole dashboard.
 */
export function parseItems(raw: unknown, legacySize?: string | null): OrderItem[] {
  if (Array.isArray(raw)) {
    const parsed: OrderItem[] = [];
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const quantity = Number(e.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) continue;

      if (typeof e.productId === "string" && typeof e.variantId === "string") {
        parsed.push({
          productId: e.productId,
          variantId: e.variantId,
          name: typeof e.name === "string" ? e.name : "Unknown product",
          variantLabel: typeof e.variantLabel === "string" ? e.variantLabel : "",
          unitPriceCents: typeof e.unitPriceCents === "number" ? e.unitPriceCents : null,
          unitWeightOz:
            typeof e.unitWeightOz === "number" ? e.unitWeightOz : UNIT_WEIGHT_OZ,
          quantity,
        });
        continue;
      }

      if (typeof e.size === "string" && LEGACY_SIZES.has(e.size)) {
        parsed.push(legacyItem(e.size, quantity));
      }
    }
    if (parsed.length > 0) return parsed;
  }

  if (legacySize && LEGACY_SIZES.has(legacySize)) {
    return [legacyItem(legacySize, 1)];
  }

  return [];
}

/** Rebuild the "M x1, L x2" summary for rows where `items_summary` is null. */
export function itemsSummaryFrom(items: OrderItem[]): string {
  return items
    .map(({ variantLabel, name, quantity }) => `${variantLabel || name} x${quantity}`)
    .join(", ");
}

export type VariantBreakdownRow = {
  productName: string;
  variantLabel: string;
  quantity: number;
};

/**
 * Units per product+variant across a set of orders, for the admin "units to
 * pull" picking list. Unlike the old single-product sizeBreakdown(), this
 * cannot enumerate every possible combination up front (there's no longer one
 * fixed list) — it only returns combos that actually appear with quantity > 0.
 */
export function variantBreakdown(orders: { items: OrderItem[] }[]): VariantBreakdownRow[] {
  const totals = new Map<string, VariantBreakdownRow>();

  for (const order of orders) {
    for (const item of order.items) {
      const key = `${item.productId}::${item.variantId}`;
      const existing = totals.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        totals.set(key, {
          productName: item.name,
          variantLabel: item.variantLabel,
          quantity: item.quantity,
        });
      }
    }
  }

  return [...totals.values()].sort(
    (a, b) =>
      a.productName.localeCompare(b.productName) ||
      a.variantLabel.localeCompare(b.variantLabel),
  );
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
  /**
   * "shipping" | "pickup", or null on orders placed before local pickup
   * existed — not a default of "shipping", since that would state as fact
   * something the row never recorded.
   */
  deliveryMethod: string | null;
  amountTotal: number | null;
  /** Null on orders recorded before tax was stored separately — not zero. */
  amountTax: number | null;
  amountSubtotal: number | null;
  /**
   * What came off the order via a promotion code, in cents. Null only on
   * orders placed before discount codes existed; 0 means a real order with
   * no code applied.
   */
  amountDiscount: number | null;
  /**
   * The code redeemed, e.g. "LAUNCH20". Null when no code was used — or when
   * the discount came from a coupon applied directly in the Stripe dashboard,
   * which carries no customer-facing code.
   */
  discountCode: string | null;
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
