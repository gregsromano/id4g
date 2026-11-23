import { CUSTOM_VERSION_PRICE_CENTS } from "./product-options";
import { windowStatus } from "./schedule";

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
  /** The admin's on/off switch; off keeps the sale saved but not applied. Defaults to on. */
  saleEnabled?: boolean;
};

export type SaleStatus = "none" | "off" | "scheduled" | "live" | "ended";

/**
 * Where a sale stands at `now`. The window is start-inclusive and
 * end-exclusive, so at exactly the end time the regular price is back.
 */
export function saleStatus(sale: SaleWindow, now: number = Date.now()): SaleStatus {
  if (sale.salePriceCents === null) return "none";
  if (sale.saleEnabled === false) return "off";
  return windowStatus(sale.saleStartsAt, sale.saleEndsAt, now);
}

/** The store-wide percent-off sale, set on /admin/products. */
export type SitewideSale = {
  /** 1–90; null means no site-wide sale is set up. */
  percentOff: number | null;
  /** The admin's on/off switch. */
  enabled: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

/** Where the site-wide sale stands at `now` — same states as a product sale. */
export function sitewideSaleStatus(sale: SitewideSale, now: number = Date.now()): SaleStatus {
  if (sale.percentOff === null) return "none";
  if (!sale.enabled) return "off";
  return windowStatus(sale.startsAt, sale.endsAt, now);
}

/** The site-wide percent off in effect at `now`, or null. */
export function livePercentOff(
  sale: SitewideSale | null | undefined,
  now: number = Date.now(),
): number | null {
  if (!sale || sitewideSaleStatus(sale, now) !== "live") return null;
  return sale.percentOff;
}

/**
 * The best price from whatever is live: the regular price, the product's own
 * sale price, or the site-wide percent off — whichever is LOWEST. Sales never
 * stack, and a sale can only lower a price. Pure, so the product page can run
 * it per size in the browser with values the server already decided are live.
 */
export function applySales(
  regularCents: number,
  productSaleCents: number | null,
  percentOff: number | null,
): number {
  let best = regularCents;
  if (productSaleCents !== null) best = Math.min(best, productSaleCents);
  if (percentOff !== null) best = Math.min(best, Math.round((regularCents * (100 - percentOff)) / 100));
  return best;
}

/**
 * What one size actually costs at `now`. The single rule the storefront and
 * /api/checkout share, so the price a shopper sees is the price Stripe
 * charges.
 */
export function priceWithSale(
  regularCents: number,
  sale: SaleWindow,
  now: number = Date.now(),
  sitewide?: SitewideSale | null,
): number {
  const productSale =
    saleStatus(sale, now) === "live" && sale.salePriceCents !== null ? sale.salePriceCents : null;
  return applySales(regularCents, productSale, livePercentOff(sitewide, now));
}

type PricedProduct = { priceCents: number; sold?: boolean } & Partial<SaleWindow>;

/**
 * A made-to-order custom version of a one-of-one: its flat price, less the
 * site-wide percent while that sale is live. A product's own sale price
 * doesn't apply — that's a price for the original piece.
 */
export function customVersionPriceCents(
  sitewide?: SitewideSale | null,
  now: number = Date.now(),
): number {
  return applySales(CUSTOM_VERSION_PRICE_CENTS, null, livePercentOff(sitewide, now));
}

/**
 * The price a shopper can actually pay for a product right now. A sold
 * one-of-one can only be bought as a custom version, so listings show that
 * price instead of the claimed original's; otherwise the best live sale
 * (product or site-wide) applies.
 */
export function currentPriceCents(
  product: PricedProduct,
  sitewide?: SitewideSale | null,
  now: number = Date.now(),
) {
  if (product.sold) return customVersionPriceCents(sitewide, now);
  return priceWithSale(product.priceCents, toSaleWindow(product), now, sitewide);
}

/**
 * The regular price to show struck through next to `currentPriceCents`, or
 * null when nothing is discounted. For a sold one-of-one that's the custom
 * version's flat price.
 */
export function compareAtPriceCents(
  product: PricedProduct,
  sitewide?: SitewideSale | null,
  now: number = Date.now(),
): number | null {
  const current = currentPriceCents(product, sitewide, now);
  const regular = product.sold ? CUSTOM_VERSION_PRICE_CENTS : product.priceCents;
  return current < regular ? regular : null;
}

/**
 * Price text for a product card: what it costs now, plus the regular price to
 * strike through when a sale is live. Both from one clock reading, so a sale
 * ending mid-render can't pair a sale price with no strikethrough.
 */
export function listingPriceLabels(
  product: PricedProduct,
  sitewide?: SitewideSale | null,
  now: number = Date.now(),
): { priceLabel: string; compareAtLabel: string | null; saleTagLabel: string | null } {
  const compareAt = compareAtPriceCents(product, sitewide, now);
  const current = currentPriceCents(product, sitewide, now);
  return {
    priceLabel: formatPrice(current),
    compareAtLabel: compareAt === null ? null : formatPrice(compareAt),
    saleTagLabel: compareAt === null ? null : saleTagLabel(compareAt, current),
  };
}

/**
 * Text for the SALE tag: the real discount, e.g. "20% off sale" — worked out
 * from the prices rather than taken from a setting, so a site-wide 20% reads
 * 20%, and a product's own sale shows its own percent. Rounded to a whole
 * percent; a discount that rounds to 0% just says "Sale".
 */
export function saleTagLabel(regularCents: number, currentCents: number): string {
  const percent = Math.round(((regularCents - currentCents) / regularCents) * 100);
  return percent >= 1 ? `${percent}% off sale` : "Sale";
}

/**
 * What shipping costs for a product at `now`: its sale shipping price while
 * the sale is live and one is set, else its normal shipping. Shared by the
 * product page and /api/checkout, like priceWithSale.
 */
export function shippingWithSale(
  regularShippingCents: number,
  sale: SaleWindow & { saleShippingCents: number | null },
  now: number = Date.now(),
): number {
  if (sale.saleShippingCents === null || saleStatus(sale, now) !== "live") {
    return regularShippingCents;
  }
  return sale.saleShippingCents;
}

function toSaleWindow(value: Partial<SaleWindow>): SaleWindow {
  return {
    salePriceCents: value.salePriceCents ?? null,
    saleStartsAt: value.saleStartsAt ?? null,
    saleEndsAt: value.saleEndsAt ?? null,
    saleEnabled: value.saleEnabled ?? true,
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
