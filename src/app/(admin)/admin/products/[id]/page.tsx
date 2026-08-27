import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProductWithVariants } from "@/lib/products";
import { formatPrice } from "@/lib/product";
import { optionsToText } from "@/lib/product-options";
import ProductImagesForm from "@/components/admin/ProductImagesForm";
import {
  regenerateVariants,
  removeProductImageAction,
  saveProductDetails,
  saveVariantPrices,
  setCoverImageAction,
  setImageAltAction,
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
      <Link
        href="/admin/products"
        className="text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
      >
        &larr; Back to products
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
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
        <form action={saveProductDetails} className="mt-4">
          <input type="hidden" name="id" value={product.id} />

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
            <textarea
              name="description"
              rows={3}
              defaultValue={product.description ?? ""}
              className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
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

          <button
            type="submit"
            className="mt-2 border border-[var(--border)] px-4 py-2 text-xs uppercase tracking-widest text-[var(--text-body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Save details
          </button>
        </form>
      </section>

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

      {/* Images */}
      <section className="mt-6 border border-[var(--border)] p-6">
        <span className="section-label">Images</span>

        {product.images.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-4">
            {product.images.map((image, index) => (
              <div key={image.url} className="relative">
                <div className="relative aspect-square border border-[var(--border)]">
                  <Image src={image.url} alt={image.alt} fill className="object-cover" />
                  {index === 0 && (
                    <span className="absolute left-2 top-2 border border-[var(--accent)] bg-[var(--bg-primary)] px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--accent)]">
                      Cover
                    </span>
                  )}
                </div>
                <form action={setImageAltAction} className="mt-2 flex gap-1">
                  <input type="hidden" name="id" value={product.id} />
                  <input type="hidden" name="url" value={image.url} />
                  <input
                    name="alt"
                    defaultValue={image.alt}
                    placeholder="Label — Front, Back..."
                    className="w-full min-w-0 border border-[var(--border)] bg-[var(--bg-section-alt)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="submit"
                    className="shrink-0 border border-[var(--border)] px-2 py-1 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    Save
                  </button>
                </form>
                {index !== 0 && (
                  <form action={setCoverImageAction} className="mt-2">
                    <input type="hidden" name="id" value={product.id} />
                    <input type="hidden" name="url" value={image.url} />
                    <button
                      type="submit"
                      className="w-full border border-[var(--border)] py-1 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      Set as cover
                    </button>
                  </form>
                )}
                <form action={removeProductImageAction} className="mt-2">
                  <input type="hidden" name="id" value={product.id} />
                  <input type="hidden" name="url" value={image.url} />
                  <button
                    type="submit"
                    className="w-full border border-[var(--border)] py-1 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:border-red-400 hover:text-red-400"
                  >
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-[var(--border)] pt-6">
          <ProductImagesForm productId={product.id} />
        </div>
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
