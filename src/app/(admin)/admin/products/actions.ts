"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-dal";
import {
  createProduct,
  deleteProduct,
  deleteVariant,
  isSlugAvailable,
  PRODUCT_STATUSES,
  SLUG_RE,
  slugify,
  updateProduct,
  upsertVariant,
  type ProductStatus,
} from "@/lib/products";

/**
 * Mutations for the product dashboard.
 *
 * Every action calls `requireAdmin()` first, matching `../actions.ts`. Server
 * actions are reachable by direct POST regardless of which page declared them,
 * so a page-level session check does not cover them.
 *
 * Validation is deliberately duplicated against the CHECK constraints in
 * 20260824000001_products.sql. The fixture store cannot enforce them, and when
 * this moves to Postgres a constraint violation surfaces as an opaque 500 —
 * catching it here produces a message the user can act on.
 */

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_SIZE_LENGTH = 16;
/** $100,000. A guard against a fat-fingered extra zero, not a business rule. */
const MAX_PRICE_CENTS = 10_000_000;

export type ActionResult = { ok: boolean; message: string };

function text(value: FormDataEntryValue | null, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

/**
 * Parse a price entered as dollars into integer cents.
 *
 * Returns null for empty input so "inherit the parent price" stays expressible.
 * Rounds rather than truncates: 49.99 * 100 is 4998.999... in floating point,
 * and truncation would silently charge a cent less.
 */
function priceCents(
  value: FormDataEntryValue | null,
  field: string,
  { required }: { required: boolean },
): number | null {
  const raw = String(value ?? "").trim().replace(/^\$/, "").replace(/,/g, "");

  if (raw === "") {
    if (required) throw new Error(`${field} is required`);
    return null;
  }

  const dollars = Number(raw);
  if (!Number.isFinite(dollars)) throw new Error(`${field} must be a number`);
  if (dollars < 0) throw new Error(`${field} cannot be negative`);

  const cents = Math.round(dollars * 100);
  if (cents > MAX_PRICE_CENTS) throw new Error(`${field} is implausibly large`);
  return cents;
}

/** Parse stock, preserving the null (untracked) / 0 (sold out) distinction. */
function stockValue(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (raw === "") return null;

  const n = Number(raw);
  if (!Number.isInteger(n)) throw new Error("Stock must be a whole number");
  if (n < 0) throw new Error("Stock cannot be negative");
  return n;
}

function statusValue(value: FormDataEntryValue | null): ProductStatus {
  const raw = String(value ?? "draft");
  if (!(PRODUCT_STATUSES as string[]).includes(raw)) {
    throw new Error("Invalid status");
  }
  return raw as ProductStatus;
}

function requireProductId(formData: FormData): string {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing product id");
  return id;
}

function revalidateProduct(id?: string) {
  revalidatePath("/admin/products");
  if (id) revalidatePath(`/admin/products/${id}`);
}

/**
 * Shared field parsing for create and update.
 *
 * A blank slug is derived from the name, which is what someone filling in the
 * form quickly will expect.
 */
async function parseProductFields(formData: FormData, exceptId?: string) {
  const name = text(formData.get("name"), MAX_NAME_LENGTH);
  if (!name) throw new Error("Name is required");

  const slugInput = text(formData.get("slug"), MAX_NAME_LENGTH);
  const slug = slugInput ? slugify(slugInput) : slugify(name);

  if (!SLUG_RE.test(slug)) {
    throw new Error(
      "URL slug must be lowercase letters, numbers and hyphens (e.g. brok3n-tee)",
    );
  }
  if (!(await isSlugAvailable(slug, exceptId))) {
    throw new Error(`The URL slug "${slug}" is already used by another product`);
  }

  const price = priceCents(formData.get("price"), "Price", { required: true });

  return {
    slug,
    name,
    description: text(formData.get("description"), MAX_DESCRIPTION_LENGTH) || null,
    // Non-null: `required: true` throws instead of returning null.
    priceCents: price as number,
    shippingCents: priceCents(formData.get("shipping"), "Shipping", {
      required: false,
    }),
    status: statusValue(formData.get("status")),
  };
}

export async function createProductAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  let newId: string;
  try {
    const fields = await parseProductFields(formData);

    const sizesRaw = text(formData.get("sizes"), 500);
    const sizes = sizesRaw
      .split(",")
      .map((s) => s.trim().slice(0, MAX_SIZE_LENGTH))
      .filter(Boolean);

    if (new Set(sizes).size !== sizes.length) {
      throw new Error("Duplicate sizes — each size may appear only once");
    }

    const product = await createProduct(fields, sizes);
    newId = product.id;
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }

  // redirect() throws to unwind, so it must sit outside the try block or the
  // catch above would swallow it and report the redirect as a failure.
  revalidateProduct(newId);
  redirect(`/admin/products/${newId}`);
}

export async function updateProductAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    const id = requireProductId(formData);
    await updateProduct(id, await parseProductFields(formData, id));
    revalidateProduct(id);
    return { ok: true, message: "Saved" };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

/**
 * Status-only change, for the list view's quick actions. Separate from the
 * full update so publishing does not require a valid complete form.
 */
export async function setProductStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = requireProductId(formData);
  await updateProduct(id, { status: statusValue(formData.get("status")) });
  revalidateProduct(id);
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = requireProductId(formData);
  await deleteProduct(id);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function upsertVariantAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    const productId = requireProductId(formData);
    const size = text(formData.get("size"), MAX_SIZE_LENGTH);
    if (!size) throw new Error("Size is required");

    const variantId = String(formData.get("variantId") ?? "").trim();

    await upsertVariant(productId, {
      id: variantId || undefined,
      size,
      priceCents: priceCents(formData.get("variantPrice"), "Variant price", {
        required: false,
      }),
      stock: stockValue(formData.get("stock")),
    });

    revalidateProduct(productId);
    return { ok: true, message: variantId ? "Variant updated" : `Added ${size}` };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

export async function deleteVariantAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const productId = requireProductId(formData);
  const variantId = String(formData.get("variantId") ?? "").trim();
  if (!variantId) throw new Error("Missing variant id");

  await deleteVariant(productId, variantId);
  revalidateProduct(productId);
}
