"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-dal";
import { getSupabaseAdmin } from "@/lib/supabase";
import { cartesianCombinations, parseOptionsText, PRODUCT_CATEGORIES } from "@/lib/product-options";
import {
  appendProductImages,
  createProduct,
  getProductWithVariants,
  removeProductImage,
  reorderProducts,
  replaceVariants,
  setCoverImage,
  setProductImages,
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
// Generous headroom over the plain-text era's limit: this now stores HTML
// from the rich-text editor, and tag markup adds real overhead per character
// of visible text.
const MAX_DESCRIPTION_LENGTH = 20000;
const MAX_IMAGE_ALT_LENGTH = 200;
// Per-file size ceilings (8MB image / 50MB video) live in AddImageTile, not
// here: the file never reaches this server any more — it goes browser ->
// Supabase with a signed token — so the only checks that can actually stop an
// oversized upload are the client's, for a friendly message, and the bucket's
// own file_size_limit, which is what truly enforces it (20260919000001).
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
// MP4 only. An iPhone .mov is usually HEVC, which Chrome on Android and most
// Windows browsers will not play — it would upload fine and look correct to
// an admin on a Mac while showing a black box to real customers, and there is
// no transcoding step here to normalize it.
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4"]);

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/mp4": "mp4",
};

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

/** Drops anything not in the fixed list (e.g. a forged POST) rather than throwing. */
function optionalCategory(formData: FormData): string | null {
  const value = String(formData.get("category") ?? "").trim();
  if (!value) return null;
  return (PRODUCT_CATEGORIES as readonly string[]).includes(value) ? value : null;
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
  const category = optionalCategory(formData);

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
      category,
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
  const category = optionalCategory(formData);

  await updateProduct(id, {
    name,
    slug,
    description,
    priceCents,
    shippingCents,
    weightOz,
    taxCode,
    category,
  });

  // Image labels and drag order live in the same form (no separate save
  // button for them — see image_url/image_alt pairs in the edit page), so
  // persist them here too. FormData.getAll() preserves DOM order, which is
  // exactly the order the admin left the images in.
  const imageUrls = formData.getAll("image_url").map(String);
  const imageAlts = formData.getAll("image_alt").map((v) => String(v ?? "").trim());
  if (imageUrls.length > 0) {
    await setProductImages(
      id,
      imageUrls.map((url, i) => ({ url, alt: (imageAlts[i] ?? "").slice(0, MAX_IMAGE_ALT_LENGTH) })),
    );
  }

  // Options/variants live in this same form too — see SizeOptionsField's
  // hidden "options" input — so the one Save button persists the size
  // picker instead of silently leaving it unsaved until a second button
  // is clicked. Existing combos keep their current price (and their id, so
  // cart lines / historical orders referencing them stay valid); brand-new
  // combos start at the product's base price; removed combos are deleted.
  if (formData.has("options")) {
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
            return { optionValues, priceCents: existing?.priceCents ?? priceCents };
          })
        : [{ optionValues: {}, priceCents }];

    await updateProduct(id, { options });
    await replaceVariants(id, desired);
  }

  revalidateProduct(id, slug);
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

export type SignedUploadResult =
  | { ok: true; path: string; token: string; publicUrl: string }
  | { ok: false; message: string };

/**
 * Mint a one-file signed upload token so the BROWSER can PUT straight to
 * Supabase Storage, never routing the bytes through a server action.
 *
 * This exists because of a hard platform ceiling, not a preference:
 * **Vercel caps a function's request body at 4.5MB** and returns 413
 * FUNCTION_PAYLOAD_TOO_LARGE above it. That limit is infrastructure-level and
 * cannot be raised by config — `serverActions.bodySizeLimit` only ever lowers
 * the ceiling within it, so a larger value there is fiction in production. Any
 * video worth uploading is far past 4.5MB, so `uploadProductImages` (which
 * receives the file itself) can never carry one on Vercel.
 *
 * Only the short-lived token crosses the function boundary here, so the
 * request stays kilobytes regardless of file size. The admin gate still
 * applies: requireAdmin() runs before a token is issued, and the token is
 * scoped to one exact path that this action chooses — the client never names
 * its own destination, so it cannot write anywhere else in the bucket.
 *
 * Size and type are NOT enforceable here (there is no file to inspect yet).
 * The bucket's own allowed_mime_types and file_size_limit are what actually
 * reject a bad upload, server-side, at the moment of the PUT.
 */
export async function createProductUploadUrl(
  productId: string,
  contentType: string,
): Promise<SignedUploadResult> {
  await requireAdmin();
  if (!UUID_RE.test(productId)) return { ok: false, message: "Invalid product id" };

  const isVideo = ALLOWED_VIDEO_TYPES.has(contentType);
  if (!isVideo && !ALLOWED_IMAGE_TYPES.has(contentType)) {
    return { ok: false, message: "Only PNG, JPEG, WEBP images or MP4 video are allowed." };
  }

  const ext = EXTENSION_BY_TYPE[contentType];
  const path = `products/${productId}/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await getSupabaseAdmin()
    .storage.from("images")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return { ok: false, message: `Could not start upload (${error?.message ?? "unknown"}).` };
  }

  const { data: pub } = getSupabaseAdmin().storage.from("images").getPublicUrl(path);
  return { ok: true, path: data.path, token: data.token, publicUrl: pub.publicUrl };
}

/**
 * Record a file the browser already PUT to storage.
 *
 * Deliberately verifies the object EXISTS before writing the row, rather than
 * trusting the client's word: the signed PUT happens outside this server's
 * sight, so a failed or spoofed upload would otherwise leave a product row
 * pointing at a 404 — which renders as a broken tile on the live storefront.
 */
export async function attachProductUpload(
  productId: string,
  path: string,
  alt: string,
): Promise<UploadImagesResult> {
  await requireAdmin();
  if (!UUID_RE.test(productId)) return { ok: false, message: "Invalid product id" };

  // The path must be the one we handed out for THIS product — never a
  // client-supplied path pointing at another product's folder.
  if (!path.startsWith(`products/${productId}/`)) {
    return { ok: false, message: "Invalid upload path." };
  }

  const slash = path.lastIndexOf("/");
  const { data: listed, error: listError } = await getSupabaseAdmin()
    .storage.from("images")
    .list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 });

  if (listError) return { ok: false, message: `Could not verify upload (${listError.message}).` };
  if (!listed || listed.length === 0) {
    return { ok: false, message: "Upload did not complete — nothing was stored." };
  }

  const { data: pub } = getSupabaseAdmin().storage.from("images").getPublicUrl(path);
  await appendProductImages(productId, [
    { url: pub.publicUrl, alt: alt.slice(0, MAX_IMAGE_ALT_LENGTH) },
  ]);
  revalidateProduct(productId);

  return { ok: true, message: "Uploaded." };
}

/**
 * The image url arrives as a BOUND argument, not a form field, for both of
 * these: React replaces a submit button's `name` with its own $ACTION_ID_…
 * when that button carries a `formAction` server action, so name/value never
 * survives the round trip. The product id still comes from the form, where a
 * hidden input carries it.
 */
export async function removeProductImageAction(url: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const id = requireId(formData);
  if (!url) throw new Error("Missing image url");

  await removeProductImage(id, url);
  revalidateProduct(id);
}

export async function setCoverImageAction(url: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const id = requireId(formData);
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

function isProductFilter(value: unknown): value is ProductFilter {
  return value === "active" || value === "draft" || value === "archived" || value === "all";
}

/**
 * Called directly from the products list's drag-and-drop handler (not bound
 * to a <form> — there's no form submission here, just a client callback), so
 * this takes plain arguments rather than FormData.
 */
export async function reorderProductsAction(ids: string[], filter: ProductFilter): Promise<void> {
  await requireAdmin();
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !UUID_RE.test(id))) {
    throw new Error("Invalid product ids");
  }
  if (!isProductFilter(filter)) throw new Error("Invalid filter");

  await reorderProducts(ids, filter);
  revalidatePath("/admin/products");
  revalidatePath("/");
}
