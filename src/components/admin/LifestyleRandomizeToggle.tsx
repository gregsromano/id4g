"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setRandomizeLifestyleAction } from "@/app/(admin)/admin/lifestyle/actions";

/**
 * Shuffle switch for the homepage lookbook.
 *
 * Same shape as the products RandomizeToggle — optimistic, rolling back if
 * the save fails so a setting that did not stick can never look like one
 * that did — but deliberately its own component rather than a shared one:
 * the copy describes a different surface, and the products version also owns
 * the pinned-product select, which has no lookbook equivalent.
 *
 * `router.refresh()` alongside the action's revalidatePath because this calls
 * the action directly instead of submitting a form; revalidation alone does
 * not re-render in that case.
 */
export default function LifestyleRandomizeToggle({
  enabled,
  imageCount,
}: {
  enabled: boolean;
  imageCount: number;
}) {
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !on;
    setOn(next);
    setError(null);

    startTransition(async () => {
      const result = await setRandomizeLifestyleAction(next);
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
            Shuffle lookbook order
          </h2>
          <p className="mt-1 max-w-prose text-sm text-[var(--text-muted)]">
            {on
              ? "Each visitor sees the photos in a different order. The order holds while they page through, so nothing repeats or gets skipped, and re-shuffles on their next visit."
              : "Visitors see the manual order set below — drag or use the arrows to change it."}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Shuffle lookbook order"
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

      {/* Saving a manual order while the shuffle is on still works and is
          still stored — say so rather than disabling the grid. Silently
          accepting a reorder the storefront ignores is exactly what made the
          products table look broken before it said this. */}
      {on && imageCount > 1 && (
        <p className="mt-4 text-sm text-[var(--accent)]">
          The order below is saved but not in use while this is on. Turn it off to
          use it.
        </p>
      )}

      <p className="mt-4 text-xs uppercase tracking-widest text-[var(--text-muted)]">
        {pending ? "Saving…" : on ? "On — random each visit" : "Off — manual order"}
      </p>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
