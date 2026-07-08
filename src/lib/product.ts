export const PRODUCT = {
  name: "BROK3N Tee — I'll Die For The Gospel",
  description: "Psalm 34:18 limited drop t-shirt",
  priceCents: 4900,
  shippingCents: 1500,
  currency: "usd",
  sizes: ["S", "M", "L", "XL", "2XL"] as const,
};

export type Size = (typeof PRODUCT.sizes)[number];

export function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
