"use client";

import { useState } from "react";

import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/product";
import { buildVariantLabel, variantOptionKey, type ProductOption } from "@/lib/variant";

type Variant = {
  id: string;
  optionValues: Record<string, string>;
  priceCents: number;
};

type Props = {
  productId: string;
  name: string;
  shippingCents: number;
  options: ProductOption[];
  variants: Variant[];
};

export default function ProductPurchasePanel({
  productId,
  name,
  shippingCents,
  options,
  variants,
}: Props) {
  const { addItem } = useCart();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const variantByKey = new Map(variants.map((v) => [variantOptionKey(v.optionValues), v]));
  const allSelected = options.every((option) => selected[option.name] !== undefined);
  const matchedVariant = allSelected ? variantByKey.get(variantOptionKey(selected)) : undefined;
  const displayPriceCents = matchedVariant?.priceCents ?? variants[0]?.priceCents ?? 0;

  function selectValue(optionName: string, value: string) {
    setSelected((prev) => ({ ...prev, [optionName]: value }));
    setError(null);
  }

  function handleAddToCart() {
    if (!allSelected) {
      const missing = options.find((o) => selected[o.name] === undefined);
      setError(missing ? `Please select a ${missing.name.toLowerCase()}.` : "Please make a selection.");
      return;
    }
    if (!matchedVariant) {
      setError("That combination isn't available.");
      return;
    }

    setError(null);
    addItem({
      productId,
      variantId: matchedVariant.id,
      name,
      variantLabel: buildVariantLabel(selected, options),
      priceCents: matchedVariant.priceCents,
      shippingCents,
    });
  }

  return (
    <div>
      <span className="section-label mb-3">The Drop</span>
      <h2 className="mb-6 text-4xl sm:text-5xl">{name}</h2>

      <div className="mb-8 flex items-baseline gap-3">
        <span className="text-4xl font-bold text-[var(--text-primary)]">
          {formatPrice(displayPriceCents)}
        </span>
        <span className="text-sm text-[var(--text-muted)]">
          + {formatPrice(shippingCents)} shipping
        </span>
      </div>

      {options.map((option) => (
        <div key={option.name} className="mb-8">
          <p className="section-label mb-3">Select {option.name}</p>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => (
              <button
                key={value}
                onClick={() => selectValue(option.name, value)}
                className={`h-12 min-w-12 border px-4 text-sm font-semibold transition-colors ${
                  selected[option.name] === value
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]"
                    : "border-[var(--border)] text-[var(--text-body)] hover:border-[var(--gold)]"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      ))}

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <button onClick={handleAddToCart} className="btn-primary w-full sm:w-auto">
        Add to Cart
      </button>
    </div>
  );
}
