import { CUSTOM_VERSION_PRICE_CENTS } from "./product-options";

/**
 * A single line in the cart: one variant of one product, with a quantity.
 * `name`/`variantLabel`/`priceCents`/`shippingCents` are snapshots taken at
 * add-to-cart time for display — the server always re-derives the real price
 * from the catalog at checkout and never trusts these.
 */
export type CartItem = {
  productId: string;
  variantId: string;
  name: string;
  variantLabel: string;
  /** Free-text fulfillment note for a made-to-order recreation, e.g. "Custom size: L". */
  customNote?: string;
  priceCents: number;
  shippingCents: number;
  quantity: number;
};

export function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/** A product's scheduled sale, as set in the admin product editor. */
export type SaleWindow = {
  salePriceCents: number | null;
  /** ISO timestamp; null means the sale has no start, i.e. already started. */
  saleStartsAt: string | null;
  /** ISO timestamp; null means the sale runs until it is removed. */
  saleEndsAt: string | null;
};

export type SaleStatus = "none" | "scheduled" | "live" | "ended";

/**
 * Where a sale stands at `now`. The window is start-inclusive and
 * end-exclusive, so at exactly the end time the regular price is back.
 */
export function saleStatus(sale: SaleWindow, now: number = Date.now()): SaleStatus {
  if (sale.salePriceCents === null) return "none";
  if (sale.saleStartsAt && now < Date.parse(sale.saleStartsAt)) return "scheduled";
  if (sale.saleEndsAt && now >= Date.parse(sale.saleEndsAt)) return "ended";
  return "live";
}

/**
 * What one size actually costs at `now`: the sale price while the sale is
 * live, but never more than that size's own regular price — a sale can only
 * lower a price. The single rule the storefront and /api/checkout share, so
 * the price a shopper sees is the price Stripe charges.
 */
export function priceWithSale(
  regularCents: number,
  sale: SaleWindow,
  now: number = Date.now(),
): number {
  if (saleStatus(sale, now) !== "live" || sale.salePriceCents === null) return regularCents;
  return Math.min(regularCents, sale.salePriceCents);
}

/**
 * The price a shopper can actually pay for a product right now. A sold
 * one-of-one can only be bought as a custom version, so listings show that
 * price instead of the claimed original's; otherwise a live sale applies.
 */
export function currentPriceCents(
  product: { priceCents: number; sold?: boolean } & Partial<SaleWindow>,
  now: number = Date.now(),
) {
  if (product.sold) return CUSTOM_VERSION_PRICE_CENTS;
  return priceWithSale(product.priceCents, toSaleWindow(product), now);
}

/**
 * The regular price to show struck through next to `currentPriceCents`, or
 * null when nothing is discounted (no live sale, or a sold one-of-one).
 */
export function compareAtPriceCents(
  product: { priceCents: number; sold?: boolean } & Partial<SaleWindow>,
  now: number = Date.now(),
): number | null {
  const current = currentPriceCents(product, now);
  return !product.sold && current < product.priceCents ? product.priceCents : null;
}

/**
 * Price text for a product card: what it costs now, plus the regular price to
 * strike through when a sale is live. Both from one clock reading, so a sale
 * ending mid-render can't pair a sale price with no strikethrough.
 */
export function listingPriceLabels(
  product: { priceCents: number; sold?: boolean } & Partial<SaleWindow>,
  now: number = Date.now(),
): { priceLabel: string; compareAtLabel: string | null } {
  const compareAt = compareAtPriceCents(product, now);
  return {
    priceLabel: formatPrice(currentPriceCents(product, now)),
    compareAtLabel: compareAt === null ? null : formatPrice(compareAt),
  };
}

function toSaleWindow(value: Partial<SaleWindow>): SaleWindow {
  return {
    salePriceCents: value.salePriceCents ?? null,
    saleStartsAt: value.saleStartsAt ?? null,
    saleEndsAt: value.saleEndsAt ?? null,
  };
}

/** Subtotal of goods only (no shipping). */
export function cartSubtotalCents(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}

/** Total unit count across all lines. */
export function cartCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * One flat shipping charge per order, sized to whichever distinct product in
 * the cart costs the most to ship. This is a deliberate simplification (not
 * a real per-carrier shipping-rate engine) — it matches today's behavior
 * exactly when the cart holds a single product, and it's cosmetic-only here:
 * the real charge is always re-derived server-side at checkout.
 */
export function shippingForCents(items: CartItem[]) {
  if (items.length === 0) return 0;
  return Math.max(...items.map((item) => item.shippingCents));
}
