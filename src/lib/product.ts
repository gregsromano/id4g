export const PRODUCT = {
  id: "brok3n-tee",
  name: "BROK3N Tee — I'll Die For The Gospel",
  description: "Psalm 34:18 limited drop t-shirt",
  priceCents: 4900,
  shippingCents: 1500,
  currency: "usd",
  sizes: ["S", "M", "L", "XL", "2XL", "3XL"] as const,
};

export type Size = (typeof PRODUCT.sizes)[number];

/** A single line in the cart: the product in a chosen size, with a quantity. */
export type CartItem = {
  productId: string;
  name: string;
  size: Size;
  priceCents: number;
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
 * Flat shipping: one shipping charge per order as long as there's at least
 * one item. Kept simple for a single-product drop.
 */
export function shippingForCents(items: CartItem[]) {
  return items.length > 0 ? PRODUCT.shippingCents : 0;
}
