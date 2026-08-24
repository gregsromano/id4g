/**
 * Product catalog types and the fixture-backed store.
 *
 * FIXTURES, NOT A DATABASE. Every function here reads from an in-memory array
 * so the dashboard can be built and reviewed before the `products` tables
 * exist on Greg's Supabase project. The signatures are async and shaped like
 * the real queries so swapping the bodies for Supabase calls is a contained
 * change — see `listProducts()` for the mapping each one expects.
 *
 * Mutations persist for the lifetime of the server process and are lost on
 * restart. That is intentional: nothing here should look like durable storage.
 */

import "server-only";

import {
  slugify,
  type Product,
  type ProductFilter,
  type ProductStatus,
  type ProductVariant,
} from "./product-types";

// Re-exported so server modules can keep importing everything from one place.
export * from "./product-types";

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

function variant(
  size: string,
  position: number,
  stock: number | null,
  priceCents: number | null = null,
): ProductVariant {
  return {
    id: `var-${size.toLowerCase()}-${position}`,
    size,
    priceCents,
    stock,
    sku: null,
    position,
  };
}

/**
 * Mirrors the live drop from `src/lib/product.ts` so the dashboard shows the
 * real product rather than lorem ipsum. Stock figures are invented — the
 * current store does not track inventory at all.
 */
const FIXTURES: Product[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "brok3n-tee",
    name: "BROK3N Tee — I'll Die For The Gospel",
    description: "Psalm 34:18 limited drop t-shirt",
    priceCents: 4900,
    shippingCents: 1500,
    currency: "usd",
    status: "active",
    position: 0,
    variants: [
      variant("S", 0, 12),
      variant("M", 1, 24),
      variant("L", 2, 18),
      variant("XL", 3, 9),
      variant("2XL", 4, 0),
      variant("3XL", 5, 4, 5400),
    ],
    images: [
      { id: "img-1", storagePath: "/shirt-back.png", alt: "BROK3N tee, back", position: 0 },
      {
        id: "img-2",
        storagePath: "/lifestyle-studio-full.png",
        alt: "Studio shot, full length",
        position: 1,
      },
      {
        id: "img-3",
        storagePath: "/lifestyle-alleyway.png",
        alt: "Alleyway lifestyle shot",
        position: 2,
      },
    ],
    createdAt: "2026-07-28T00:00:00.000Z",
    updatedAt: "2026-08-19T00:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    slug: "psalm-34-hoodie",
    name: "Psalm 34 Hoodie",
    description: "Heavyweight fleece, embroidered chest mark. Second drop.",
    priceCents: 8900,
    shippingCents: null,
    currency: "usd",
    status: "draft",
    position: 1,
    variants: [
      variant("S", 0, null),
      variant("M", 1, null),
      variant("L", 2, null),
      variant("XL", 3, null),
    ],
    images: [
      {
        id: "img-4",
        storagePath: "/lifestyle-studio-seated.png",
        alt: "Seated studio shot",
        position: 0,
      },
    ],
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    slug: "founders-tee-first-run",
    name: "Founders Tee — First Run",
    description: "The original run. Retired.",
    priceCents: 4500,
    shippingCents: null,
    currency: "usd",
    status: "archived",
    position: 2,
    variants: [variant("M", 0, 0), variant("L", 1, 0)],
    images: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
  },
];

/**
 * Process-lifetime mutable copy. Deep-cloned from FIXTURES so edits made in
 * the dashboard survive navigation within a dev session.
 */
const store: Product[] = structuredClone(FIXTURES);

/**
 * Real query when this moves to Supabase:
 *   products left join product_variants left join product_images,
 *   ordered by position, filtered by status.
 */
export async function listProducts(
  options: { filter?: ProductFilter; search?: string } = {},
): Promise<Product[]> {
  const { filter = "all", search = "" } = options;
  const needle = search.trim().toLowerCase();

  return store
    .filter((p) => (filter === "all" ? true : p.status === filter))
    .filter((p) =>
      needle === ""
        ? true
        : p.name.toLowerCase().includes(needle) ||
          p.slug.toLowerCase().includes(needle),
    )
    .sort((a, b) => a.position - b.position)
    .map((p) => structuredClone(p));
}

export async function getProduct(id: string): Promise<Product | null> {
  const found = store.find((p) => p.id === id);
  return found ? structuredClone(found) : null;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const found = store.find((p) => p.slug === slug);
  return found ? structuredClone(found) : null;
}

export type ProductSummary = {
  total: number;
  active: number;
  draft: number;
  /** Variants tracking stock that have hit zero. */
  soldOutVariants: number;
  /** Active products with no image, which render as a blank card. */
  missingImages: number;
};

export async function getProductSummary(): Promise<ProductSummary> {
  return {
    total: store.length,
    active: store.filter((p) => p.status === "active").length,
    draft: store.filter((p) => p.status === "draft").length,
    soldOutVariants: store
      .filter((p) => p.status === "active")
      .reduce((n, p) => n + p.variants.filter((v) => v.stock === 0).length, 0),
    missingImages: store.filter((p) => p.status === "active" && p.images.length === 0)
      .length,
  };
}

export type ProductInput = {
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  shippingCents: number | null;
  status: ProductStatus;
};

/** True when `slug` is free, ignoring `exceptId` (the product being edited). */
export async function isSlugAvailable(slug: string, exceptId?: string) {
  return !store.some((p) => p.slug === slug && p.id !== exceptId);
}

export async function createProduct(
  input: ProductInput,
  sizes: string[],
): Promise<Product> {
  const now = new Date().toISOString();
  const product: Product = {
    // Fixture-only id. Postgres supplies a real uuid via gen_random_uuid().
    id: `local-${store.length + 1}-${slugify(input.slug)}`,
    ...input,
    currency: "usd",
    position: store.length,
    variants: sizes.map((size, i) => variant(size, i, null)),
    images: [],
    createdAt: now,
    updatedAt: now,
  };
  store.push(product);
  return structuredClone(product);
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<void> {
  const product = store.find((p) => p.id === id);
  if (!product) throw new Error("Product not found");
  Object.assign(product, input);
  product.updatedAt = new Date().toISOString();
}

export async function deleteProduct(id: string): Promise<void> {
  const index = store.findIndex((p) => p.id === id);
  if (index === -1) throw new Error("Product not found");
  store.splice(index, 1);
}

export async function upsertVariant(
  productId: string,
  input: { id?: string; size: string; priceCents: number | null; stock: number | null },
): Promise<void> {
  const product = store.find((p) => p.id === productId);
  if (!product) throw new Error("Product not found");

  if (input.id) {
    const existing = product.variants.find((v) => v.id === input.id);
    if (!existing) throw new Error("Variant not found");
    // The DB enforces (product_id, size) uniqueness; mirror it here so the
    // fixture store cannot drift into a state Postgres would reject.
    if (product.variants.some((v) => v.id !== input.id && v.size === input.size)) {
      throw new Error(`Size "${input.size}" already exists on this product`);
    }
    Object.assign(existing, input);
  } else {
    if (product.variants.some((v) => v.size === input.size)) {
      throw new Error(`Size "${input.size}" already exists on this product`);
    }
    product.variants.push({
      id: `var-${slugify(input.size)}-${product.variants.length}`,
      size: input.size,
      priceCents: input.priceCents,
      stock: input.stock,
      sku: null,
      position: product.variants.length,
    });
  }
  product.updatedAt = new Date().toISOString();
}

export async function deleteVariant(productId: string, variantId: string) {
  const product = store.find((p) => p.id === productId);
  if (!product) throw new Error("Product not found");
  product.variants = product.variants.filter((v) => v.id !== variantId);
  product.updatedAt = new Date().toISOString();
}
