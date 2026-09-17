"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setRandomizeProductsAction } from "@/app/(admin)/admin/products/settings-actions";

/**
 * Storefront product-order toggle.
 *
 * Optimistic: the switch moves on click and rolls back if the save fails, so
 * a setting that did not stick can never look like one that did.
 *
 * `router.refresh()` alongside the action's `revalidatePath` because this
 * calls the action directly rather than submitting a form — revalidation
 * alone does not re-render in that case (the same trap that made lifestyle
 * uploads look silent).
 */
export default function RandomizeToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
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

  return (
    <div className="mt-8 border border-[var(--border)] p-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="!text-base !normal-case text-[var(--text-primary)]">
            Shuffle product order
          </h2>
          <p className="mt-1 max-w-prose text-sm text-[var(--text-muted)]">
            {on
              ? "Shoppers see the products in a different order on every visit, so no product is always first."
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
              on
                ? "left-[34px] bg-[var(--accent)]"
                : "left-1 bg-[var(--text-muted)]"
            }`}
          />
        </button>
      </div>

      <p className="mt-3 text-xs uppercase tracking-widest text-[var(--text-muted)]">
        {pending ? "Saving…" : on ? "On — random each visit" : "Off — manual order"}
      </p>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
