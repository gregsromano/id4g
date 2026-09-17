"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  setPinnedProductAction,
  setRandomizeProductsAction,
} from "@/app/(admin)/admin/products/settings-actions";

export type PinnableProduct = { id: string; name: string };

/**
 * Storefront product-order controls: the shuffle toggle, and the product
 * pinned to first place while it is on.
 *
 * Optimistic: both controls move on click and roll back if the save fails,
 * so a setting that did not stick can never look like one that did.
 *
 * `router.refresh()` alongside each action's `revalidatePath` because these
 * call actions directly rather than submitting a form — revalidation alone
 * does not re-render in that case (the trap that made lifestyle uploads look
 * silent).
 */
export default function RandomizeToggle({
  enabled,
  pinnedProductId,
  products,
}: {
  enabled: boolean;
  pinnedProductId: string | null;
  products: PinnableProduct[];
}) {
  const [on, setOn] = useState(enabled);
  const [pinned, setPinned] = useState<string | null>(pinnedProductId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !on;
    setOn(next);
    setError(null);

    startTransition(async () => {
      const result = await setRandomizeProductsAction(next);
      if (result && "error" in result) {
        setOn(!next); // roll back to what the server still has
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function choosePinned(value: string) {
    const next = value === "" ? null : value;
    const previous = pinned;
    setPinned(next);
    setError(null);

    startTransition(async () => {
      const result = await setPinnedProductAction(next);
      if (result && "error" in result) {
        setPinned(previous);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-8 border border-[var(--border)] p-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="!text-base !normal-case text-[var(--text-primary)]">
            Shuffle product order
          </h2>
          <p className="mt-1 max-w-prose text-sm text-[var(--text-muted)]">
            {on
              ? "Shoppers see the products in a different order on every visit."
              : "Shoppers see the manual order set below — drag or use the arrows to change it."}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Shuffle product order"
          onClick={toggle}
          disabled={pending}
          className={`relative mt-1 h-11 w-[72px] shrink-0 border transition-colors disabled:opacity-50 ${
            on
              ? "border-[var(--accent)] bg-[var(--accent)]/20"
              : "border-[var(--border)] bg-transparent"
          }`}
        >
          {/* 44px tall hit area: the admin's touch-target floor. */}
          <span
            className={`absolute top-1/2 h-8 w-8 -translate-y-1/2 transition-all ${
              on ? "left-[34px] bg-[var(--accent)]" : "left-1 bg-[var(--text-muted)]"
            }`}
          />
        </button>
      </div>

      {/* The pin only means anything while shuffling — with the shuffle off,
          the manual order already decides what comes first, so showing a
          second "what's first" control would be two answers to one question. */}
      {on && (
        <div className="mt-5 border-t border-[var(--border)] pt-5">
          <label
            htmlFor="pinned-product"
            className="block text-xs uppercase tracking-widest text-[var(--text-muted)]"
          >
            Keep one product first
          </label>
          <select
            id="pinned-product"
            value={pinned ?? ""}
            onChange={(event) => choosePinned(event.target.value)}
            disabled={pending}
            className="mt-2 h-11 w-full max-w-sm border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] disabled:opacity-50"
          >
            <option value="">Nothing pinned — shuffle everything</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <p className="mt-2 max-w-prose text-sm text-[var(--text-muted)]">
            {pinned
              ? "This product always shows first; the rest are shuffled below it."
              : "Every product takes a turn in first place."}
          </p>
        </div>
      )}

      <p className="mt-4 text-xs uppercase tracking-widest text-[var(--text-muted)]">
        {pending ? "Saving…" : on ? "On — random each visit" : "Off — manual order"}
      </p>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
