"use client";

import { useState } from "react";

import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/product";
import { STANDARD_SIZES } from "@/lib/product-options";
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
  category?: string | null;
  sold?: boolean;
};

export default function ProductPurchasePanel({
  productId,
  name,
  shippingCents,
  options,
  variants,
  category,
  sold,
}: Props) {
  const { addItem } = useCart();
  const isOneOfOne = category === "One of One";
  // A one-of-one piece has exactly one variant — nothing to choose, so it
  // starts pre-selected instead of making the buyer click a size button
  // that's the only option anyway.
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    isOneOfOne ? (variants[0]?.optionValues ?? {}) : {},
  );
  const [error, setError] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customSize, setCustomSize] = useState<string>(STANDARD_SIZES[0].value);
  const [customNote, setCustomNote] = useState("");

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

  /**
   * A one-of-one piece exists in exactly one size. This adds the same
   * variant to the cart with a fulfillment note instead of a different
   * variant — there's nothing else to select from — so it checks out
   * through the normal flow but is made to order rather than shipped as the
   * original. Available even when the original is sold, since it's a
   * recreation, not the claimed piece.
   */
  function handleAddCustomOrder() {
    const variant = variants[0];
    if (!variant) return;

    const note = [`Custom size: ${customSize}`, customNote.trim()]
      .filter(Boolean)
      .join(" — ");

    addItem({
      productId,
      variantId: variant.id,
      name,
      variantLabel: "",
      customNote: note,
      priceCents: variant.priceCents,
      shippingCents,
    });
    setCustomOpen(false);
    setCustomNote("");
  }

  return (
    <div>
      <span className="section-label mb-3">The Drop</span>
      {/* h1, not h2: this is the product page's actual subject, and the page
          had no h1 at all — search engines use it as the primary signal of
          what the page is about. The `!` overrides globals.css's h1 rule
          (clamp(56px, 9vw, 118px), unlayered so it beats a plain Tailwind
          utility) — same trick the About page's h1 uses. */}
      <h1 className="mb-6 !text-2xl sm:!text-3xl">{name}</h1>

      <div className="mb-8 flex items-baseline gap-3">
        <span className="text-4xl font-bold text-[var(--text-primary)]">
          {formatPrice(displayPriceCents)}
        </span>
        <span className="text-sm text-[var(--text-muted)]">
          {shippingCents === 0 ? "Free shipping" : `+ ${formatPrice(shippingCents)} shipping`}
        </span>
      </div>

      {/* A one-of-one piece has exactly one variant, pre-selected above —
          nothing to pick — so the size sits next to the buy button as plain
          info instead of a picker the buyer would have to click with only
          one option in it. */}
      {isOneOfOne ? (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            {options.map((option) => (
              <p key={option.name} className="text-[34px] font-bold text-[var(--text-muted)]">
                {option.name}: <span className="text-[var(--text-primary)]">{selected[option.name]}</span>
              </p>
            ))}
          </div>

          {sold ? (
            <div className="flex-1 border border-[var(--border)] px-6 py-4 text-center font-[family-name:var(--font-block)] text-xl uppercase tracking-wide text-[var(--text-muted)]">
              Sold &mdash; this one of one has been claimed
            </div>
          ) : (
            <button onClick={handleAddToCart} className="btn-primary">
              Buy This Original One of One
            </button>
          )}
        </div>
      ) : (
        options.map((option) => (
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
        ))
      )}

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {!isOneOfOne && (
        <button onClick={handleAddToCart} className="btn-primary w-full sm:w-auto">
          Add to Cart
        </button>
      )}

      {/* Only one size exists for a one-of-one piece — this offers a
          made-to-order recreation in a different size instead, which stays
          available even after the original sells. Styled as its own
          call-out (not a quiet text link) since it's a real alternate path
          to purchase, not a footnote. */}
      {isOneOfOne && (
        <div className={sold ? "" : "mt-8 border-2 border-[var(--accent)] p-4"}>
          {/* Once the original is claimed the custom version is the only way
              to buy, so it becomes the page's primary button rather than a
              secondary call-out. */}
          {sold ? (
            <>
              <button
                type="button"
                onClick={() => setCustomOpen((v) => !v)}
                className="btn-primary w-full !px-4 !py-6 !text-base !font-extrabold !tracking-wide sm:!text-xl"
              >
                {customOpen ? "Custom Version ↑" : "Order a custom version →"}
              </button>
              <p className="mt-4 text-lg text-[var(--text-body)]">
                Made just for you, in your size. Inspired by this piece, with
                unique handmade details.
              </p>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setCustomOpen((v) => !v)}
              className="w-full text-left text-lg font-bold uppercase tracking-wide text-[var(--accent)]"
            >
              {customOpen ? "Hide custom size request ↑" : "Need a different size? ↓"}
            </button>
          )}

          {customOpen && (
            <div className={sold ? "mt-6 border border-[var(--border)] p-4" : "mt-4"}>
              {/* Size first: it's the one thing the buyer has to choose, so it
                  sits right under the button that opened the form. */}
              <label className="mb-4 block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">
                  Choose Size
                </span>
                <select
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  className="h-12 w-full border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]"
                >
                  {STANDARD_SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </label>

              <p className="mb-4 text-sm text-[var(--text-body)]">
                This is a one-of-one piece, made in a single size. We can make
                you a custom recreation as close to the original as possible,
                in the size you need.
              </p>

              <label className="mb-4 block">
                <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
                  Notes (optional)
                </span>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  rows={3}
                  maxLength={300}
                  className="w-full border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </label>

              <p className="mb-4 border-l-2 border-[var(--accent)] pl-3 text-sm text-[var(--text-body)]">
                <span className="font-bold uppercase tracking-wide text-[var(--text-primary)]">
                  All sales final.
                </span>{" "}
                Every custom version is made to order just for you, so custom
                orders can&rsquo;t be refunded.
              </p>

              <button onClick={handleAddCustomOrder} className="btn-primary w-full sm:w-auto">
                Buy Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reinforces the homepage's cream banner and the About page's "no two
          alike" promise right at the point of purchase, where it was
          otherwise only ever in the page's (invisible) meta description. */}
      <p className="mt-4 text-xs uppercase tracking-widest text-[var(--text-muted)]">
        Hand-made &middot;{" "}
        <span className="text-[var(--accent)]">One of a kind</span> &middot; No
        two pieces are exactly alike
      </p>
    </div>
  );
}
