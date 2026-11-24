import type { CheckoutVariant } from "./products";
import { customVersionPriceCents, priceWithSale, shippingWithSale, type SitewideSale } from "./product";
import { CUSTOM_VERSION_PRICE_CENTS } from "./product-options";

/** Postgres uuid text form. Anything else would make the variant lookup error out. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * What one cart line costs right now: unit price and shipping. The single
 * rule /api/checkout charges and /api/cart/prices shows, so the cart drawer
 * can never display a price Stripe won't charge.
 *
 * A live sale lowers the unit price itself. A custom version (customNote
 * present) gets only the site-wide percent and normal shipping — a product's
 * own sale, and its sale shipping, are for the original piece.
 */
export function priceLine(
  variant: CheckoutVariant,
  customNote: string,
  sitewideSale: SitewideSale,
  now: number,
): { priceCents: number; shippingCents: number } {
  if (customNote) {
    return {
      priceCents: customVersionPriceCents(sitewideSale, now),
      shippingCents: variant.product.shippingCents,
    };
  }
  return {
    priceCents: priceWithSale(variant.priceCents, variant.product, now, sitewideSale),
    shippingCents: shippingWithSale(variant.product.shippingCents, variant.product, now),
  };
}

/** A line's price with no sale applied: the variant's price, or the custom version's flat price. */
export function regularLinePriceCents(variant: CheckoutVariant, customNote: string): number {
  return customNote ? CUSTOM_VERSION_PRICE_CENTS : variant.priceCents;
}

/**
 * Whether a line can be bought as-is: the variant belongs to the product, the
 * product is live, and a sold one-of-one is only ever ordered as a custom
 * version, never re-sold as the claimed original.
 */
export function isPurchasable(variant: CheckoutVariant, productId: string, customNote: string): boolean {
  if (variant.productId !== productId) return false;
  if (variant.product.status !== "active") return false;
  if (variant.product.sold && !customNote) return false;
  return true;
}
