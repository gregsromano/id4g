"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-dal";
import { getSupabaseAdmin } from "@/lib/supabase";
import { cartesianCombinations, parseOptionsText } from "@/lib/product-options";
import {
  appendProductImages,
  createProduct,
  getProductWithVariants,
  moveProduct,
  removeProductImage,
  replaceVariants,
  setCoverImage,
  setImageAlts,
  setProductStatus,
  updateProduct,
  variantOptionKey,
  type DesiredVariant,
  type ProductFilter,
  type ProductStatus,
} from "@/lib/products";

/**
 * Server actions for the admin product catalog.
 *
 * Every action calls `requireAdmin()` first — a page-level session check does
 * NOT cover these: server actions are reachable by direct POST no matter which
 * page declared them (see admin/actions.ts for the same note).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 4000;
const MAX_IMAGE_ALT_LENGTH = 200;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function requireId(formData: FormData): string {
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) throw new Error("Invalid product id");
  return id;
}

function optionalText(value: FormDataEntryValue | null, maxLength: number) {
  const text = String(value ?? "").trim();
  if (text.length === 0) return null;
  return text.slice(0, maxLength);
}

/** Dollars-as-typed ("49.00") -> integer cents. Null if not a valid non-negative amount. */
function parsePriceDollars(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const dollars = Number(text);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}

function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function revalidateProduct(id?: string, slug?: string) {
  revalidatePath("/admin/products");
  if (id) revalidatePath(`/admin/products/${id}`);
  revalidatePath("/");
  if (slug) revalidatePath(`/products/${slug}`);
}

export type CreateProductResult = {
  ok: boolean;
  message: string;
};

/**
 * Creates the shell record only. Images and per-variant prices need a
 * productId to attach to, so this redirects straight to the edit page rather
 * than trying to do everything in one form.
 */
export async function createProductAction(
  _prev: CreateProductResult | null,
  formData: FormData,
): Promise<CreateProductResult> {
  await requireAdmin();

  const name = optionalText(formData.get("name"), MAX_NAME_LENGTH);
  const slug = optionalText(formData.get("slug"), 200)?.toLowerCase() ?? null;
  const priceCents = parsePriceDollars(formData.get("price"));

  if (!name) return { ok: false, message: "Name is required." };
  if (!slug || !SLUG_RE.test(slug)) {
    return {
      ok: false,
      message: "Slug is required and must be lowercase letters, numbers, and hyphens only.",
    };
  }
  if (priceCents === null) {
    return { ok: false, message: "Enter a valid, non-negative price." };
  }

  const options = parseOptionsText(String(formData.get("options") ?? ""));
  const shippingCents = parsePriceDollars(formData.get("shipping")) ?? 0;
  const weightOz = parseOptionalInt(formData.get("weight_oz"));
  const taxCode = optionalText(formData.get("tax_code"), 60) ?? "txcd_30011000";
  const description = optionalText(formData.get("description"), MAX_DESCRIPTION_LENGTH);

  let id: string;
  try {
    id = await createProduct({
      slug,
      name,
      description,
      priceCents,
      currency: "usd",
      shippingCents,
      weightOz,
      taxCode,
      options,
    });
  } catch {
    // The most likely cause here is a duplicate slug (unique constraint);
    // createProduct()'s fail() helper already logged the real DB error.
    return { ok: false, message: "Could not create product — is that slug already in use?" };
  }

  // Seed one variant per option combination at the base price, so the
  // product is immediately sellable without a second trip through the form.
  const combos = cartesianCombinations(options);
  if (combos.length > 0) {
    await replaceVariants(
      id,
      combos.map((optionValues) => ({ optionValues, priceCents })),
    );
  } else {
    await replaceVariants(id, [{ optionValues: {}, priceCents }]);
  }

  revalidateProduct(id, slug);
  redirect(`/admin/products/${id}`);
}

export async function saveProductDetails(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = requireId(formData);

  const name = optionalText(formData.get("name"), MAX_NAME_LENGTH);
  const slug = optionalText(formData.get("slug"), 200)?.toLowerCase() ?? null;
  const priceCents = parsePriceDollars(formData.get("price"));

  if (!name) throw new Error("Name is required");
  if (!slug || !SLUG_RE.test(slug)) throw new Error("Invalid slug");
  if (priceCents === null) throw new Error("Invalid price");

  const shippingCents = parsePriceDollars(formData.get("shipping")) ?? 0;
  const weightOz = parseOptionalInt(formData.get("weight_oz"));
  const taxCode = optionalText(formData.get("tax_code"), 60) ?? "txcd_30011000";
  const description = optionalText(formData.get("description"), MAX_DESCRIPTION_LENGTH);

  await updateProduct(id, {
    name,
    slug,
    description,
    priceCents,
    shippingCents,
    weightOz,
    taxCode,
  });

  // Image labels live in the same form (no separate save button for them —
  // see image_url/image_alt pairs in the edit page), so persist them here too.
  const imageUrls = formData.getAll("image_url").map(String);
  const imageAlts = formData.getAll("image_alt").map((v) => String(v ?? "").trim());
  if (imageUrls.length > 0) {
    await setImageAlts(
      id,
      imageUrls.map((url, i) => ({ url, alt: (imageAlts[i] ?? "").slice(0, MAX_IMAGE_ALT_LENGTH) })),
    );
  }

  revalidateProduct(id, slug);
}

/**
 * Regenerates variant rows from a freshly-edited options list. Existing
 * combos keep their current price (and their id, so cart lines / historical
 * orders referencing them stay valid); brand-new combos start at the
 * product's base price; removed combos are deleted.
 */
export async function regenerateVariants(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = requireId(formData);

  const options = parseOptionsText(String(formData.get("options") ?? ""));
  const product = await getProductWithVariants(id);
  if (!product) throw new Error("Product not found");

  const existingByKey = new Map(product.variants.map((v) => [v.optionKey, v]));
  const combos = cartesianCombinations(options);
  const desired: DesiredVariant[] =
    combos.length > 0
      ? combos.map((optionValues) => {
          const key = variantOptionKey(optionValues);
          const existing = existingByKey.get(key);
          return { optionValues, priceCents: existing?.priceCents ?? product.priceCents };
        })
      : [{ optionValues: {}, priceCents: product.priceCents }];

  await updateProduct(id, { options });
  await replaceVariants(id, desired);

  revalidateProduct(id, product.slug);
}

/** Bulk price update for the existing variant table — one field per variant id. */
export async function saveVariantPrices(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = requireId(formData);

  const product = await getProductWithVariants(id);
  if (!product) throw new Error("Product not found");

  const desired: DesiredVariant[] = product.variants.map((variant) => {
    const priceCents = parsePriceDollars(formData.get(`price_${variant.id}`)) ?? variant.priceCents;
    const sku = optionalText(formData.get(`sku_${variant.id}`), 100);
    return { optionValues: variant.optionValues, priceCents, sku };
  });

  await replaceVariants(id, desired);
  revalidateProduct(id, product.slug);
}

export type UploadImagesResult = {
  ok: boolean;
  message: string;
};

export async function uploadProductImages(
  _prev: UploadImagesResult | null,
  formData: FormData,
): Promise<UploadImagesResult> {
  await requireAdmin();
  const id = requireId(formData);

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return { ok: false, message: "Choose at least one image file." };
  }

  const uploaded: { url: string; alt: string }[] = [];

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return { ok: false, message: `${file.name}: only PNG, JPEG, or WEBP images are allowed.` };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { ok: false, message: `${file.name}: file is larger than 8MB.` };
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `products/${id}/${crypto.randomUUID()}.${ext}`;

    const { error } = await getSupabaseAdmin()
      .storage.from("images")
      .upload(path, file, { contentType: file.type });

    if (error) {
      return { ok: false, message: `${file.name}: upload failed (${error.message}).` };
    }

    const { data } = getSupabaseAdmin().storage.from("images").getPublicUrl(path);
    uploaded.push({ url: data.publicUrl, alt: file.name });
  }

  await appendProductImages(id, uploaded);
  revalidateProduct(id);

  return { ok: true, message: `Uploaded ${uploaded.length} image${uploaded.length === 1 ? "" : "s"}.` };
}

export async function removeProductImageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = requireId(formData);
  const url = String(formData.get("url") ?? "");
  if (!url) throw new Error("Missing image url");

  await removeProductImage(id, url);
  revalidateProduct(id);
}

export async function setCoverImageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = requireId(formData);
  const url = String(formData.get("url") ?? "");
  if (!url) throw new Error("Missing image url");

  await setCoverImage(id, url);
  revalidateProduct(id);
}

function requireStatus(formData: FormData): ProductStatus {
  const status = String(formData.get("status") ?? "");
  if (status !== "draft" && status !== "active" && status !== "archived") {
    throw new Error("Invalid status");
  }
  return status;
}

export async function setProductStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = requireId(formData);
  const status = requireStatus(formData);

  await setProductStatus(id, status);
  revalidateProduct(id);
}

function requireFilter(formData: FormData): ProductFilter {
  const filter = String(formData.get("filter") ?? "all");
  if (filter !== "active" && filter !== "draft" && filter !== "archived" && filter !== "all") {
    return "all";
  }
  return filter;
}

function requireDirection(formData: FormData): "up" | "down" {
  const direction = String(formData.get("direction") ?? "");
  if (direction !== "up" && direction !== "down") throw new Error("Invalid direction");
  return direction;
}

export async function reorderProductAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = requireId(formData);
  const direction = requireDirection(formData);
  const filter = requireFilter(formData);

  await moveProduct(id, direction, filter);
  revalidatePath("/admin/products");
  revalidatePath("/");
}
