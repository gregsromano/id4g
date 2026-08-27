"use client";

import { removeOrder } from "@/app/(admin)/admin/actions";

/**
 * Permanently deletes an order — for test/junk orders, not real customer
 * ones. Confirms first since this can't be undone (unlike everything else
 * in the admin, which only ever archives/cancels).
 */
export default function RemoveOrderButton({
  id,
  customerLabel,
}: {
  id: string;
  customerLabel: string;
}) {
  return (
    <form
      action={removeOrder}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Permanently remove the order from ${customerLabel}? This cannot be undone.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-red-400"
      >
        Remove
      </button>
    </form>
  );
}
