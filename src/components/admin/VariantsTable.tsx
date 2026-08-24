"use client";

import { useActionState } from "react";

import {
  deleteVariantAction,
  upsertVariantAction,
  type ActionResult,
} from "@/app/(admin)/admin/products/actions";
import { formatPrice } from "@/lib/product";
import type { Product, ProductVariant } from "@/lib/product-types";

/**
 * Per-size price and stock editor.
 *
 * Each row is its own form so a save touches one variant, and an error on one
 * row cannot discard edits in progress on another.
 */
export default function VariantsTable({ product }: { product: Product }) {
  return (
    <section className="mt-12">
      <span className="section-label">Sizes</span>
      <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
        Leave price blank to inherit {formatPrice(product.priceCents)}. Leave stock
        blank to sell without tracking inventory — which is how the live drop
        currently works. Zero means sold out.
      </p>

      <div className="mt-6 border border-[var(--border)]">
        <div className="hidden grid-cols-[100px_1fr_1fr_88px] gap-4 border-b border-[var(--border)] px-4 py-3 sm:grid">
          <span className="section-label">Size</span>
          <span className="section-label">Price</span>
          <span className="section-label">Stock</span>
          <span />
        </div>

        {product.variants.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
            No sizes yet. Add one below.
          </p>
        ) : (
          product.variants.map((variant) => (
            <VariantRow key={variant.id} product={product} variant={variant} />
          ))
        )}
      </div>

      <AddVariant product={product} />
    </section>
  );
}

function VariantRow({
  product,
  variant,
}: {
  product: Product;
  variant: ProductVariant;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    upsertVariantAction,
    null,
  );

  const soldOut = variant.stock === 0;

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <form
        action={action}
        className="grid grid-cols-2 items-center gap-4 px-4 py-3 sm:grid-cols-[100px_1fr_1fr_88px]"
      >
        <input type="hidden" name="id" value={product.id} />
        <input type="hidden" name="variantId" value={variant.id} />

        <div className="flex items-center gap-2">
          <input
            name="size"
            defaultValue={variant.size}
            maxLength={16}
            required
            className="w-16 border border-[var(--border)] bg-[var(--bg-section-alt)] px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          {soldOut && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
              Out
            </span>
          )}
        </div>

        <div className="flex items-center border border-[var(--border)] bg-[var(--bg-section-alt)] focus-within:border-[var(--accent)]">
          <span className="pl-2 text-xs text-[var(--text-muted)]">$</span>
          <input
            name="variantPrice"
            defaultValue={
              variant.priceCents === null ? "" : (variant.priceCents / 100).toFixed(2)
            }
            inputMode="decimal"
            placeholder={(product.priceCents / 100).toFixed(2)}
            className="w-full bg-transparent px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none"
          />
        </div>

        <input
          name="stock"
          defaultValue={variant.stock === null ? "" : String(variant.stock)}
          inputMode="numeric"
          placeholder="Untracked"
          className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />

        <div className="col-span-2 flex items-center justify-end gap-4 sm:col-span-1">
          <button
            type="submit"
            disabled={pending}
            className="text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
          >
            {pending ? "..." : "Save"}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between px-4 pb-3">
        {state ? (
          <span
            className={`text-xs ${state.ok ? "text-[var(--accent)]" : "text-red-400"}`}
          >
            {state.message}
          </span>
        ) : (
          <span />
        )}

        {/* Separate form: nesting a second form inside the row form is invalid. */}
        <form action={deleteVariantAction}>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="variantId" value={variant.id} />
          <button
            type="submit"
            className="text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-red-400"
          >
            Remove
          </button>
        </form>
      </div>
    </div>
  );
}

function AddVariant({ product }: { product: Product }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    upsertVariantAction,
    null,
  );

  return (
    <form action={action} className="mt-4 flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={product.id} />
      <input
        name="size"
        required
        maxLength={16}
        placeholder="Add size"
        className="w-28 border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
      />
      <button type="submit" disabled={pending} className="btn-outline !py-2 !px-5">
        {pending ? "Adding..." : "Add"}
      </button>
      {state && (
        <span className={`text-xs ${state.ok ? "text-[var(--accent)]" : "text-red-400"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
