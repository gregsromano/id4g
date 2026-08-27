import { notFound } from "next/navigation";

import { getProductWithVariants } from "@/lib/products";
import { formatPrice } from "@/lib/product";
import { optionsToText, PRODUCT_CATEGORIES } from "@/lib/product-options";
import ImageReorderGrid from "@/components/admin/ImageReorderGrid";
import RichTextEditor from "@/components/admin/RichTextEditor";
import SaveButton from "@/components/admin/SaveButton";
import UnsavedChangesForm, { GuardedLink } from "@/components/admin/UnsavedChangesForm";
import {
  regenerateVariants,
  removeProductImageAction,
  saveProductDetails,
  saveVariantPrices,
  setCoverImageAction,
  setProductStatusAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductWithVariants(id);

  if (!product) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* The Details form wraps everything down through the images grid
          (using `contents` so it doesn't affect layout) so the save button
          in the sticky bar is a true descendant — useFormStatus() only
          reports pending state for a form's own descendants, not an element
          merely associated via the HTML `form` attribute. Image labels are
          plain fields in this same form (no separate save button); "Set as
          cover" and "Remove" override the submission to their own action via
          `formAction` + a per-button `name="url"`, so they stay independent,
          immediate actions within the one form. Options/variants and status
          are distinct concerns and keep their own forms below. */}
      <UnsavedChangesForm action={saveProductDetails} className="contents">
        <input type="hidden" name="id" value={product.id} />

        {/* Sticky save bar */}
        <div className="sticky top-0 z-10 -mx-6 mb-6 flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-primary)] px-6 py-4 sm:-mx-10 sm:px-10">
          <GuardedLink
            href="/admin/products"
            className="text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
          >
            &larr; Back to products
          </GuardedLink>
          <div className="flex items-center gap-3">
            <SaveButton />
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline !py-2 !px-6"
            >
              Live Site
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="section-label">Product</span>
            <h1 className="!text-3xl mt-1 text-[var(--text-primary)]">{product.name}</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">/{product.slug}</p>
          </div>
          <span className="border border-[var(--border)] px-3 py-1 text-xs uppercase tracking-widest text-[var(--text-muted)]">
            {product.status}
          </span>
        </div>

        {/* Core details */}
        <section className="mt-8 border border-[var(--border)] p-6">
          <span className="section-label">Details</span>
          <div className="mt-4">
            <Field label="Name">
            <input
              name="name"
              defaultValue={product.name}
              required
              className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </Field>

          <Field label="Slug">
            <input
              name="slug"
              defaultValue={product.slug}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </Field>

          <Field label="Description">
            <RichTextEditor name="description" defaultValue={product.description ?? ""} />
          </Field>

          <Field label="Category">
            <select
              name="category"
              defaultValue={product.category ?? ""}
              className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            >
              <option value="">No category</option>
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Base price (USD)">
              <input
                name="price"
                defaultValue={(product.priceCents / 100).toFixed(2)}
                required
                inputMode="decimal"
                className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </Field>
            <Field label="Shipping (USD)">
              <input
                name="shipping"
                defaultValue={(product.shippingCents / 100).toFixed(2)}
                inputMode="decimal"
                className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Weight (oz)">
              <input
                name="weight_oz"
                defaultValue={product.weightOz ?? ""}
                inputMode="numeric"
                className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </Field>
            <Field label="Stripe tax code">
              <input
                name="tax_code"
                defaultValue={product.taxCode}
                className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </Field>
          </div>
          </div>
        </section>

        {/* Images — inside the same form: labels and drag order save with
            the top button; Set as cover / Remove override to their own
            action per-click via formAction + a button-scoped name="url", so
            only the clicked image's url is submitted for that action. The
            "+" upload tile is not part of this form — uploads are immediate,
            not deferred to Save. */}
        <section className="mt-6 border border-[var(--border)] p-6">
          <span className="section-label">Images</span>
          <div className="mt-4">
            <ImageReorderGrid
              productId={product.id}
              images={product.images}
              setCoverAction={setCoverImageAction}
              removeAction={removeProductImageAction}
            />
          </div>
        </section>
      </UnsavedChangesForm>

      {/* Options -> variants */}
      <section className="mt-6 border border-[var(--border)] p-6">
        <span className="section-label">Options</span>
        <form action={regenerateVariants} className="mt-4">
          <input type="hidden" name="id" value={product.id} />
          <textarea
            name="options"
            rows={3}
            defaultValue={optionsToText(product.options)}
            placeholder={"Size: S, M, L, XL\nColor: Black, White"}
            className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            One option per line: &quot;Size: S, M, L&quot;. Changing this regenerates the variant
            list below — existing combinations keep their price, new ones start at the base
            price, removed ones are deleted.
          </p>
          <button
            type="submit"
            className="mt-3 border border-[var(--border)] px-4 py-2 text-xs uppercase tracking-widest text-[var(--text-body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Regenerate variants
          </button>
        </form>

        {product.variants.length > 0 && (
          <form action={saveVariantPrices} className="mt-6 border-t border-[var(--border)] pt-6">
            <input type="hidden" name="id" value={product.id} />
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="pb-2 text-xs uppercase tracking-widest text-[var(--text-muted)]">
                    Variant
                  </th>
                  <th className="pb-2 text-xs uppercase tracking-widest text-[var(--text-muted)]">
                    Price (USD)
                  </th>
                  <th className="pb-2 text-xs uppercase tracking-widest text-[var(--text-muted)]">
                    SKU
                  </th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => (
                  <tr key={variant.id} className="border-t border-[var(--border)]">
                    <td className="py-2 pr-4 text-[var(--text-body)]">
                      {Object.entries(variant.optionValues)
                        .map(([k, v]) => `${k} ${v}`)
                        .join(" / ") || "Default"}
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        name={`price_${variant.id}`}
                        defaultValue={(variant.priceCents / 100).toFixed(2)}
                        inputMode="decimal"
                        className="w-28 border border-[var(--border)] bg-[var(--bg-section-alt)] px-2 py-1 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        name={`sku_${variant.id}`}
                        defaultValue={variant.sku ?? ""}
                        className="w-32 border border-[var(--border)] bg-[var(--bg-section-alt)] px-2 py-1 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="submit"
              className="mt-4 border border-[var(--border)] px-4 py-2 text-xs uppercase tracking-widest text-[var(--text-body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Save variant prices
            </button>
          </form>
        )}
      </section>

      {/* Status */}
      <section className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-[var(--border)] p-6">
        <div>
          <span className="section-label">Status</span>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {product.status === "active"
              ? `Live on the storefront at /products/${product.slug}.`
              : product.status === "draft"
                ? "Not visible on the storefront."
                : "Archived — no longer sold. Past orders referencing it still display correctly."}
          </p>
          {product.status === "active" && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Base price {formatPrice(product.priceCents)}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {product.status !== "active" && (
            <StatusButton id={product.id} status="active" label="Publish" />
          )}
          {product.status !== "draft" && (
            <StatusButton id={product.id} status="draft" label="Unpublish to draft" />
          )}
          {product.status !== "archived" && (
            <StatusButton id={product.id} status="archived" label="Archive" danger />
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-5 block">
      <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatusButton({
  id,
  status,
  label,
  danger,
}: {
  id: string;
  status: "draft" | "active" | "archived";
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={setProductStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={`border px-4 py-3 text-xs uppercase tracking-widest transition-colors ${
          danger
            ? "border-[var(--border)] text-[var(--text-muted)] hover:border-red-400 hover:text-red-400"
            : "border-[var(--border)] text-[var(--text-body)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
