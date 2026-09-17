"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setDiscountActiveAction } from "@/app/(admin)/admin/discounts/actions";
import type { DiscountCode } from "@/lib/discounts";

/**
 * The discount code list.
 *
 * A table on desktop, stacked cards below `sm` — the products table ran off
 * screen on a phone before it got the same treatment, and this has the same
 * column count.
 */
export default function DiscountsTable({ codes }: { codes: DiscountCode[] }) {
  if (codes.length === 0) {
    return (
      <p className="mt-8 border border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">
        No discount codes yet. Create one above and it works at checkout
        immediately.
      </p>
    );
  }

  return (
    <>
      {/* Desktop */}
      <table className="mt-8 hidden w-full border-collapse sm:table">
        <thead>
          <tr className="border-b border-[var(--border)] text-left">
            {["Code", "Discount", "Used", "Status", ""].map((heading) => (
              <th
                key={heading}
                className="pb-3 text-xs uppercase tracking-widest text-[var(--text-muted)]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {codes.map((code) => (
            <tr key={code.id} className="border-b border-[var(--border)]">
              <td className="py-4 text-sm uppercase tracking-widest text-[var(--text-primary)]">
                {code.code}
              </td>
              <td className="py-4 text-sm text-[var(--text-primary)]">
                {code.percentOff}% off
              </td>
              <td className="py-4 text-sm text-[var(--text-muted)]">
                {usageLabel(code)}
              </td>
              <td className="py-4">
                <StatusPill active={code.active} />
                {windowLabel(code) && (
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    {windowLabel(code)}
                  </span>
                )}
              </td>
              <td className="py-4 text-right">
                <ToggleButton code={code} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile */}
      <div className="mt-8 sm:hidden">
        {codes.map((code) => (
          <div key={code.id} className="border-b border-[var(--border)] py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm uppercase tracking-widest text-[var(--text-primary)]">
                {code.code}
              </span>
              <StatusPill active={code.active} />
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {code.percentOff}% off · used {usageLabel(code)}
            </p>
            {windowLabel(code) && (
              <p className="mt-1 text-xs text-[var(--text-muted)]">{windowLabel(code)}</p>
            )}
            <div className="mt-3">
              <ToggleButton code={code} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** "3 of 25" when capped, otherwise just the count. */
function usageLabel(code: DiscountCode): string {
  return code.maxRedemptions === null
    ? String(code.timesRedeemed)
    : `${code.timesRedeemed} of ${code.maxRedemptions}`;
}

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * The one line that says why a code is or is not usable right now.
 *
 * Ordered by what actually stops a redemption first: a used-up or expired
 * code is finished regardless of its switch, so those outrank "Inactive".
 */
function windowLabel(code: DiscountCode): string | null {
  const now = Math.floor(Date.now() / 1000);

  if (code.maxRedemptions !== null && code.timesRedeemed >= code.maxRedemptions) {
    return "All used up";
  }
  if (code.expiresAt !== null && code.expiresAt <= now) {
    return `Ended ${formatDate(code.expiresAt)}`;
  }
  if (code.scheduled && code.startsAt !== null) {
    return `Starts ${formatDate(code.startsAt)}`;
  }
  if (code.expiresAt !== null) return `Ends ${formatDate(code.expiresAt)}`;
  return null;
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block border px-3 py-1 text-xs uppercase tracking-widest ${
        active
          ? "border-[var(--accent)] text-[var(--accent)]"
          : "border-[var(--border)] text-[var(--text-muted)]"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/**
 * Activate / deactivate.
 *
 * Calls the action directly rather than through a form, so `revalidatePath`
 * alone does NOT re-render — a direct action call needs `router.refresh()`
 * too. That is the exact bug that made lifestyle uploads look like they did
 * nothing while they were working the whole time.
 *
 * The id is bound as an argument, never a form field: React clobbers a submit
 * button's `name` when it carries a `formAction` server action.
 */
function ToggleButton({ code }: { code: DiscountCode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      try {
        await setDiscountActiveAction(code.id, !code.active);
        router.refresh();
      } catch {
        setError("Could not update. Try again.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className="min-h-11 border border-[var(--border)] px-4 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50 sm:min-h-0 sm:py-2"
      >
        {isPending ? "Saving…" : code.active ? "Deactivate" : "Activate"}
      </button>
      {error && <p className="mt-2 text-xs text-[var(--accent)]">{error}</p>}
    </>
  );
}
