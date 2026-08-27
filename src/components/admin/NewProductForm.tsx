"use client";

import { useActionState } from "react";

import { createProductAction, type CreateProductResult } from "@/app/(admin)/admin/products/actions";
import { PRODUCT_CATEGORIES } from "@/lib/product-options";
import RichTextEditor from "./RichTextEditor";

export default function NewProductForm() {
  const [state, action, pending] = useActionState<CreateProductResult | null, FormData>(
    createProductAction,
    null,
  );

  return (
    <form action={action} className="mt-8 max-w-2xl border border-[var(--border)] p-6">
      <Field label="Name">
        <input
          name="name"
          required
          className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </Field>

      <Field label="Slug" hint="Lowercase letters, numbers, hyphens only — used in the product URL.">
        <input
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          placeholder="brok3n-tee"
          className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </Field>

      <Field label="Description">
        <RichTextEditor name="description" />
      </Field>

      <Field label="Category">
        <select
          name="category"
          defaultValue=""
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
        <Field label="Price (USD)">
          <input
            name="price"
            required
            inputMode="decimal"
            placeholder="49.00"
            className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        </Field>
        <Field label="Shipping (USD)">
          <input
            name="shipping"
            inputMode="decimal"
            placeholder="15.00"
            className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Weight (oz)" hint="Leave blank to use the default estimate.">
          <input
            name="weight_oz"
            inputMode="numeric"
            className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        </Field>
        <Field label="Stripe tax code" hint="Defaults to general clothing.">
          <input
            name="tax_code"
            placeholder="txcd_30011000"
            className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
        </Field>
      </div>

      <Field
        label="Options"
        hint={'One option per line: "Size: S, M, L, XL". Leave blank for a single, size-less product. Every combination becomes a variant at this base price — adjust individual variant prices after creating.'}
      >
        <textarea
          name="options"
          rows={3}
          placeholder={"Size: S, M, L, XL\nColor: Black, White"}
          className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </Field>

      <button type="submit" disabled={pending} className="btn-primary mt-6">
        {pending ? "Creating..." : "Create product"}
      </button>

      {state && !state.ok && (
        <p className="mt-4 border border-red-400 p-4 text-sm text-red-400">{state.message}</p>
      )}
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-5 block">
      <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--text-muted)]">{hint}</span>}
    </label>
  );
}
