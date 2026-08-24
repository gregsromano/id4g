/**
 * Catalog types and pure helpers — safe to import from client components.
 *
 * Split out of `products.ts` deliberately: that module is `server-only`
 * because it holds the data layer, but the admin forms need these types and
 * helpers in the browser. Importing them from products.ts pulls the server
 * guard into the client bundle and the build fails.
 *
 * Nothing here may touch the database, the filesystem, or any secret.
 */

export type ProductStatus = "draft" | "active" | "archived";

export type ProductVariant = {
  id: string;
  size: string;
  /** Null means "inherit the parent product's price". */
  priceCents: number | null;
  /**
   * Null means stock is untracked and the variant always sells. 0 means sold
   * out. Collapsing the two would silently make untracked variants unbuyable.
   */
  stock: number | null;
  sku: string | null;
  position: number;
};

export type ProductImage = {
  id: string;
  /**
   * Supabase Storage object path once uploads are live. The fixtures use
   * paths under /public so the dashboard renders real imagery today.
   */
  storagePath: string;
  alt: string | null;
  position: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  shippingCents: number | null;
  currency: string;
  status: ProductStatus;
  position: number;
  variants: ProductVariant[];
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
};

export type ProductFilter = "all" | ProductStatus;

/** Store-wide fallback when a product does not set its own shipping. */
export const DEFAULT_SHIPPING_CENTS = 1500;

export const PRODUCT_STATUSES: ProductStatus[] = ["draft", "active", "archived"];

/** The sizes offered by the current drop, used to seed a new product. */
export const DEFAULT_SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];

/** Slugs must match the CHECK constraint in the products migration. */
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The price a shopper pays for a variant, resolving inheritance. */
export function variantPriceCents(product: Product, variant: ProductVariant) {
  return variant.priceCents ?? product.priceCents;
}

/** Shipping for a product, resolving to the store-wide default. */
export function shippingCentsFor(product: Product) {
  return product.shippingCents ?? DEFAULT_SHIPPING_CENTS;
}

/**
 * Total units across tracked variants, or null when no variant tracks stock.
 * Null and 0 mean different things and must stay distinguishable.
 */
export function totalStock(product: Product): number | null {
  const tracked = product.variants.filter((v) => v.stock !== null);
  if (tracked.length === 0) return null;
  return tracked.reduce((sum, v) => sum + (v.stock ?? 0), 0);
}

/** Price span across variants, for the list view. */
export function priceRangeCents(product: Product): { min: number; max: number } {
  if (product.variants.length === 0) {
    return { min: product.priceCents, max: product.priceCents };
  }
  const prices = product.variants.map((v) => variantPriceCents(product, v));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
