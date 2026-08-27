import "server-only";

import { assertServiceRoleConfigured, getSupabaseAdmin } from "./supabase";
import { buildVariantLabel, variantOptionKey, type ProductOption } from "./variant";

export { buildVariantLabel, variantOptionKey };
export type { ProductOption };

/**
 * Product catalog reads/writes.
 *
 * RLS is enabled and FORCED on `products`/`product_variants` with no
 * policies, so every query here goes through the service-role client, which
 * bypasses RLS. That key must never reach the browser — `server-only` turns
 * an accidental client import into a build error. Mirrors the conventions in
 * admin-orders.ts: explicit column lists (never `select("*")`), row->domain
 * mappers, a `fail()` helper that never leaks raw DB errors to the client.
 */

export type ProductStatus = "draft" | "active" | "archived";

export type ProductImage = { url: string; alt: string; position: number };

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: ProductStatus;
  priceCents: number;
  currency: string;
  shippingCents: number;
  weightOz: number | null;
  taxCode: string;
  options: ProductOption[];
  images: ProductImage[];
  /** Manual storefront display order — lower shows first. */
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductVariant = {
  id: string;
  productId: string;
  optionValues: Record<string, string>;
  optionKey: string;
  priceCents: number;
  sku: string | null;
  position: number;
};

export type ProductWithVariants = Product & { variants: ProductVariant[] };

function isProductStatus(value: unknown): value is ProductStatus {
  return value === "draft" || value === "active" || value === "archived";
}

const PRODUCT_COLUMNS = [
  "id",
  "slug",
  "name",
  "description",
  "status",
  "price_cents",
  "currency",
  "shipping_cents",
  "weight_oz",
  "tax_code",
  "options",
  "images",
  "position",
  "created_at",
  "updated_at",
].join(", ");

const VARIANT_COLUMNS = [
  "id",
  "product_id",
  "option_values",
  "option_key",
  "price_cents",
  "sku",
  "position",
].join(", ");

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  price_cents: number;
  currency: string;
  shipping_cents: number;
  weight_oz: number | null;
  tax_code: string;
  options: unknown;
  images: unknown;
  position: number;
  created_at: string;
  updated_at: string;
};

type VariantRow = {
  id: string;
  product_id: string;
  option_values: unknown;
  option_key: string;
  price_cents: number;
  sku: string | null;
  position: number;
};

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: isProductStatus(row.status) ? row.status : "draft",
    priceCents: row.price_cents,
    currency: row.currency,
    shippingCents: row.shipping_cents,
    weightOz: row.weight_oz,
    taxCode: row.tax_code,
    options: Array.isArray(row.options) ? (row.options as ProductOption[]) : [],
    images: Array.isArray(row.images) ? (row.images as ProductImage[]) : [],
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toVariant(row: VariantRow): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    optionValues:
      row.option_values && typeof row.option_values === "object"
        ? (row.option_values as Record<string, string>)
        : {},
    optionKey: row.option_key,
    priceCents: row.price_cents,
    sku: row.sku,
    position: row.position,
  };
}

function fail(context: string, error: { code?: string; message?: string }): never {
  console.error(`[products] ${context}`, {
    code: error.code,
    message: error.message,
  });
  throw new Error(`Failed to ${context}`);
}

/** Storefront grid: every active product. */
export async function listActiveProducts(): Promise<Product[]> {
  assertServiceRoleConfigured();

  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("status", "active")
    .order("position", { ascending: true });

  if (error) fail("list active products", error);

  return (data as unknown as ProductRow[]).map(toProduct);
}

/** Storefront detail page. Draft/archived products are treated as not found. */
export async function getProductBySlug(slug: string): Promise<ProductWithVariants | null> {
  assertServiceRoleConfigured();

  const { data: productRow, error: productError } = await getSupabaseAdmin()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (productError) fail("load product", productError);
  if (!productRow) return null;

  const product = toProduct(productRow as unknown as ProductRow);

  const { data: variantRows, error: variantError } = await getSupabaseAdmin()
    .from("product_variants")
    .select(VARIANT_COLUMNS)
    .eq("product_id", product.id)
    .order("position", { ascending: true });

  if (variantError) fail("load product variants", variantError);

  return {
    ...product,
    variants: (variantRows as unknown as VariantRow[]).map(toVariant),
  };
}

export type ProductFilter = "active" | "draft" | "archived" | "all";

export type AdminProductSummary = Product & {
  variantCount: number;
  minPriceCents: number;
  maxPriceCents: number;
};

/** Admin products list, with a variant-count/price-range rollup per product. */
export async function listAllProductsForAdmin(
  filter: ProductFilter = "all",
): Promise<AdminProductSummary[]> {
  assertServiceRoleConfigured();

  let query = getSupabaseAdmin()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("position", { ascending: true });

  if (filter !== "all") query = query.eq("status", filter);

  const { data, error } = await query;
  if (error) fail("list products", error);

  const products = (data as unknown as ProductRow[]).map(toProduct);
  if (products.length === 0) return [];

  const { data: variantRows, error: variantError } = await getSupabaseAdmin()
    .from("product_variants")
    .select("product_id, price_cents")
    .in(
      "product_id",
      products.map((p) => p.id),
    );

  if (variantError) fail("summarize product variants", variantError);

  const byProduct = new Map<string, number[]>();
  for (const row of variantRows as unknown as { product_id: string; price_cents: number }[]) {
    const prices = byProduct.get(row.product_id) ?? [];
    prices.push(row.price_cents);
    byProduct.set(row.product_id, prices);
  }

  return products.map((product) => {
    const prices = byProduct.get(product.id) ?? [];
    return {
      ...product,
      variantCount: prices.length,
      minPriceCents: prices.length > 0 ? Math.min(...prices) : product.priceCents,
      maxPriceCents: prices.length > 0 ? Math.max(...prices) : product.priceCents,
    };
  });
}

/** Admin edit page: the product plus every variant, in display order. */
export async function getProductWithVariants(id: string): Promise<ProductWithVariants | null> {
  assertServiceRoleConfigured();

  const { data: productRow, error: productError } = await getSupabaseAdmin()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (productError) fail("load product", productError);
  if (!productRow) return null;

  const product = toProduct(productRow as unknown as ProductRow);

  const { data: variantRows, error: variantError } = await getSupabaseAdmin()
    .from("product_variants")
    .select(VARIANT_COLUMNS)
    .eq("product_id", id)
    .order("position", { ascending: true });

  if (variantError) fail("load product variants", variantError);

  return {
    ...product,
    variants: (variantRows as unknown as VariantRow[]).map(toVariant),
  };
}

export type NewProductInput = {
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  shippingCents: number;
  weightOz: number | null;
  taxCode: string;
  options: ProductOption[];
};

/** Creates the shell record. Images/variants are added afterward, once an id exists. */
export async function createProduct(input: NewProductInput): Promise<string> {
  assertServiceRoleConfigured();
  const supabase = getSupabaseAdmin();

  // New products go to the end of the display order by default.
  const { data: maxRow, error: maxError } = await supabase
    .from("products")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) fail("determine new product position", maxError);
  const nextPosition = ((maxRow as { position: number } | null)?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("products")
    .insert({
      slug: input.slug,
      name: input.name,
      description: input.description,
      price_cents: input.priceCents,
      currency: input.currency,
      shipping_cents: input.shippingCents,
      weight_oz: input.weightOz,
      tax_code: input.taxCode,
      options: input.options,
      position: nextPosition,
    })
    .select("id")
    .single();

  if (error) fail("create product", error);

  return (data as { id: string }).id;
}

export type ProductPatch = Partial<{
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  shippingCents: number;
  weightOz: number | null;
  taxCode: string;
  options: ProductOption[];
}>;

export async function updateProduct(id: string, patch: ProductPatch): Promise<void> {
  assertServiceRoleConfigured();

  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.slug !== undefined) row.slug = patch.slug;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.priceCents !== undefined) row.price_cents = patch.priceCents;
  if (patch.currency !== undefined) row.currency = patch.currency;
  if (patch.shippingCents !== undefined) row.shipping_cents = patch.shippingCents;
  if (patch.weightOz !== undefined) row.weight_oz = patch.weightOz;
  if (patch.taxCode !== undefined) row.tax_code = patch.taxCode;
  if (patch.options !== undefined) row.options = patch.options;

  const { error } = await getSupabaseAdmin().from("products").update(row).eq("id", id);
  if (error) fail("update product", error);
}

/** draft/active/archived. No delete function exists anywhere — past orders may reference a variant. */
export async function setProductStatus(id: string, status: ProductStatus): Promise<void> {
  assertServiceRoleConfigured();

  const { error } = await getSupabaseAdmin()
    .from("products")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) fail("update product status", error);
}

export type DesiredVariant = {
  optionValues: Record<string, string>;
  priceCents: number;
  sku?: string | null;
};

/**
 * Regenerates a product's variant rows from its current option definitions.
 * Diffs against existing rows by option_key: updates prices/skus for combos
 * that still exist, inserts new combos, deletes combos no longer offered.
 * Existing variantIds are preserved for unchanged combos, which matters
 * because cart lines and historical orders reference variant ids directly.
 */
export async function replaceVariants(
  productId: string,
  desired: DesiredVariant[],
): Promise<void> {
  assertServiceRoleConfigured();
  const supabase = getSupabaseAdmin();

  const { data: existingRows, error: existingError } = await supabase
    .from("product_variants")
    .select(VARIANT_COLUMNS)
    .eq("product_id", productId);

  if (existingError) fail("load existing variants", existingError);

  const existing = (existingRows as unknown as VariantRow[]).map(toVariant);
  const existingByKey = new Map(existing.map((v) => [v.optionKey, v]));

  const desiredByKey = new Map(
    desired.map((d) => [variantOptionKey(d.optionValues), d] as const),
  );

  const toInsert = [...desiredByKey.entries()]
    .filter(([key]) => !existingByKey.has(key))
    .map(([key, d]) => ({
      product_id: productId,
      option_values: d.optionValues,
      option_key: key,
      price_cents: d.priceCents,
      sku: d.sku ?? null,
      position: 0,
    }));

  const toUpdate = [...desiredByKey.entries()].filter(([key]) => existingByKey.has(key));

  const toDeleteIds = existing
    .filter((v) => !desiredByKey.has(v.optionKey))
    .map((v) => v.id);

  if (toInsert.length > 0) {
    const { error } = await supabase.from("product_variants").insert(toInsert);
    if (error) fail("insert product variants", error);
  }

  for (const [key, d] of toUpdate) {
    const existingVariant = existingByKey.get(key)!;
    const { error } = await supabase
      .from("product_variants")
      .update({
        price_cents: d.priceCents,
        sku: d.sku ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingVariant.id);
    if (error) fail("update product variant", error);
  }

  if (toDeleteIds.length > 0) {
    const { error } = await supabase
      .from("product_variants")
      .delete()
      .in("id", toDeleteIds);
    if (error) fail("delete product variants", error);
  }
}

export async function appendProductImages(
  productId: string,
  newImages: { url: string; alt: string }[],
): Promise<void> {
  assertServiceRoleConfigured();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("products")
    .select("images")
    .eq("id", productId)
    .single();

  if (error) fail("load product images", error);

  const current = Array.isArray((data as { images: unknown }).images)
    ? ((data as { images: ProductImage[] }).images)
    : [];

  const images = [
    ...current,
    ...newImages.map((img, i) => ({ ...img, position: current.length + i })),
  ];

  const { error: updateError } = await supabase
    .from("products")
    .update({ images, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (updateError) fail("save product images", updateError);
}

export async function removeProductImage(productId: string, url: string): Promise<void> {
  assertServiceRoleConfigured();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("products")
    .select("images")
    .eq("id", productId)
    .single();

  if (error) fail("load product images", error);

  const current = Array.isArray((data as { images: unknown }).images)
    ? ((data as { images: ProductImage[] }).images)
    : [];

  const images = current
    .filter((img) => img.url !== url)
    .map((img, position) => ({ ...img, position }));

  const { error: updateError } = await supabase
    .from("products")
    .update({ images, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (updateError) fail("remove product image", updateError);
}

/**
 * Moves an image to position 0 — the storefront grid and gallery both use
 * `images[0]` as the cover/first-shown photo, so this is how an admin
 * chooses which upload is "the" image without needing full drag-reorder.
 */
export async function setCoverImage(productId: string, url: string): Promise<void> {
  assertServiceRoleConfigured();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("products")
    .select("images")
    .eq("id", productId)
    .single();

  if (error) fail("load product images", error);

  const current = Array.isArray((data as { images: unknown }).images)
    ? ((data as { images: ProductImage[] }).images)
    : [];

  const chosen = current.find((img) => img.url === url);
  if (!chosen) return;

  const images = [chosen, ...current.filter((img) => img.url !== url)].map(
    (img, position) => ({ ...img, position }),
  );

  const { error: updateError } = await supabase
    .from("products")
    .update({ images, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (updateError) fail("set cover image", updateError);
}

/**
 * Swaps a product's display position with its neighbor in the given filtered
 * view (e.g. "active"), so an admin's up/down click always visibly swaps two
 * adjacent rows in whatever list they're looking at, rather than jumping past
 * a hidden draft/archived product in between.
 */
export async function moveProduct(
  id: string,
  direction: "up" | "down",
  filter: ProductFilter,
): Promise<void> {
  assertServiceRoleConfigured();
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("products")
    .select("id, position")
    .order("position", { ascending: true });
  if (filter !== "all") query = query.eq("status", filter);

  const { data, error } = await query;
  if (error) fail("load products for reorder", error);

  const rows = (data ?? []) as { id: string; position: number }[];
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return;

  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= rows.length) return;

  const current = rows[index];
  const neighbor = rows[neighborIndex];

  const { error: err1 } = await supabase
    .from("products")
    .update({ position: neighbor.position })
    .eq("id", current.id);
  if (err1) fail("reorder product", err1);

  const { error: err2 } = await supabase
    .from("products")
    .update({ position: current.position })
    .eq("id", neighbor.id);
  if (err2) fail("reorder product", err2);
}

export type CheckoutVariant = {
  variantId: string;
  productId: string;
  optionValues: Record<string, string>;
  priceCents: number;
  product: {
    id: string;
    name: string;
    slug: string;
    status: ProductStatus;
    currency: string;
    shippingCents: number;
    taxCode: string;
    weightOz: number | null;
    options: ProductOption[];
  };
};

/**
 * The one lookup `/api/checkout` calls. Never trust a client-submitted price:
 * this returns the server-side price/currency/tax_code/product status for
 * each requested variant id, batched in a single query.
 */
export async function getVariantsForCheckout(
  variantIds: string[],
): Promise<CheckoutVariant[]> {
  assertServiceRoleConfigured();

  if (variantIds.length === 0) return [];

  const { data, error } = await getSupabaseAdmin()
    .from("product_variants")
    .select(
      `id, product_id, option_values, price_cents, products (id, name, slug, status, currency, shipping_cents, tax_code, weight_oz, options)`,
    )
    .in("id", variantIds);

  if (error) fail("load variants for checkout", error);

  type JoinedRow = {
    id: string;
    product_id: string;
    option_values: unknown;
    price_cents: number;
    products: {
      id: string;
      name: string;
      slug: string;
      status: string;
      currency: string;
      shipping_cents: number;
      tax_code: string;
      weight_oz: number | null;
      options: unknown;
    } | null;
  };

  return (data as unknown as JoinedRow[])
    .filter((row): row is JoinedRow & { products: NonNullable<JoinedRow["products"]> } =>
      row.products !== null,
    )
    .map((row) => ({
      variantId: row.id,
      productId: row.product_id,
      optionValues:
        row.option_values && typeof row.option_values === "object"
          ? (row.option_values as Record<string, string>)
          : {},
      priceCents: row.price_cents,
      product: {
        id: row.products.id,
        name: row.products.name,
        slug: row.products.slug,
        status: isProductStatus(row.products.status) ? row.products.status : "draft",
        currency: row.products.currency,
        shippingCents: row.products.shipping_cents,
        taxCode: row.products.tax_code,
        weightOz: row.products.weight_oz,
        options: Array.isArray(row.products.options)
          ? (row.products.options as ProductOption[])
          : [],
      },
    }));
}
