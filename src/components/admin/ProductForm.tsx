"use client";

import { useActionState, useState } from "react";

import {
  createProductAction,
  updateProductAction,
  type ActionResult,
} from "@/app/(admin)/admin/products/actions";
import { DEFAULT_SIZES, slugify, type Product } from "@/lib/product-types";

/**
 * Create/edit form for a product.
 *
 * One component serves both modes: `product` absent means create. The size
 * field only appears on create, since an existing product's sizes are managed
 * through the variants table where each has its own price and stock.
 */
export default function ProductForm({ product }: { product?: Product }) {
  const editing = product !== undefined;

  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    editing ? updateProductAction : createProductAction,
    null,
  );

  // The slug auto-fills from the name until it is edited by hand, at which
  // point typing in the name field must stop overwriting the user's choice.
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);

  /** Cents to a plain dollar string for the number inputs. */
  const dollars = (cents: number | null | undefined) =>
    cents === null || cents === undefined ? "" : (cents / 100).toFixed(2);

  return (
    <form action={action} className="mt-8 max-w-2xl">
      {editing && <input type="hidden" name="id" value={product.id} />}

      <Field label="Name" required>
        <input
          name="name"
          required
          maxLength={200}
          defaultValue={product?.name ?? ""}
          onChange={(e) => {
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          placeholder="BROK3N Tee — I'll Die For The Gospel"
          className={INPUT}
        />
      </Field>

      <Field
        label="URL slug"
        hint="Lowercase letters, numbers and hyphens. Leave blank to derive from the name."
      >
        <div className="flex items-center border border-[var(--border)] bg-[var(--bg-section-alt)] focus-within:border-[var(--accent)]">
          <span className="pl-3 font-mono text-xs text-[var(--text-muted)]">/</span>
          <input
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="brok3n-tee"
            className="w-full bg-transparent px-2 py-2 font-mono text-sm text-[var(--text-primary)] outline-none"
          />
        </div>
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={product?.description ?? ""}
          placeholder="Psalm 34:18 limited drop t-shirt"
          className={INPUT}
        />
      </Field>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Field label="Price" required hint="In dollars, e.g. 49.00">
          <MoneyInput name="price" required defaultValue={dollars(product?.priceCents)} />
        </Field>

        <Field label="Shipping" hint="Blank uses the store default of $15.00">
          <MoneyInput name="shipping" defaultValue={dollars(product?.shippingCents)} />
        </Field>
      </div>

      <Field label="Status">
        <select
          name="status"
          defaultValue={product?.status ?? "draft"}
          className={INPUT}
        >
          <option value="draft">Draft — hidden from the storefront</option>
          <option value="active">Active — purchasable</option>
          <option value="archived">Archived — hidden, kept for order history</option>
        </select>
      </Field>

      {!editing && (
        <Field
          label="Sizes"
          hint="Comma separated. Each becomes a variant you can price and stock individually."
        >
          <input
            name="sizes"
            defaultValue={DEFAULT_SIZES.join(", ")}
            placeholder="S, M, L, XL"
            className={INPUT}
          />
        </Field>
      )}

      <div className="mt-8 flex items-center gap-4">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving..." : editing ? "Save changes" : "Create product"}
        </button>

        {/* A successful create redirects, so this only ever reports an edit. */}
        {state && (
          <span
            className={`text-sm ${
              state.ok ? "text-[var(--accent)]" : "text-red-400"
            }`}
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

const INPUT =
  "w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]";

/**
 * Money input.
 *
 * `inputMode="decimal"` rather than `type="number"`: number inputs let a
 * scroll wheel silently change a price while the field has focus.
 */
function MoneyInput({
  name,
  required,
  defaultValue,
}: {
  name: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="flex items-center border border-[var(--border)] bg-[var(--bg-section-alt)] focus-within:border-[var(--accent)]">
      <span className="pl-3 text-sm text-[var(--text-muted)]">$</span>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        inputMode="decimal"
        placeholder="0.00"
        className="w-full bg-transparent px-2 py-2 text-sm text-[var(--text-primary)] outline-none"
      />
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-6 block first:mt-0">
      <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
        {label}
        {required && <span className="text-[var(--accent)]"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-2 block text-xs text-[var(--text-muted)]">{hint}</span>}
    </label>
  );
}
