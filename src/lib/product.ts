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
  priceCents: number;
  shippingCents: number;
  quantity: number;
};

export function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
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
