"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  createDiscountAction,
  type CreateDiscountState,
} from "@/app/(admin)/admin/discounts/actions";

/**
 * Create a discount code.
 *
 * Deliberately two fields. Percent-off is the only discount type this store
 * offers, so there is no type selector to choose wrong.
 */
export default function NewDiscountForm() {
  const [state, action, pending] = useActionState<CreateDiscountState, FormData>(
    createDiscountAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields after a successful create so the next code starts from
  // an empty form rather than the previous one's text, which is easy to
  // submit again by accident.
  useEffect(() => {
    if (state && "ok" in state) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="mt-8 max-w-xl border border-[var(--border)] p-6"
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
            Code
          </span>
          <input
            name="code"
            required
            placeholder="LAUNCH20"
            autoCapitalize="characters"
            autoComplete="off"
            // Typed lowercase, shown uppercase — the server uppercases it
            // anyway, so this just keeps the field honest about what gets
            // saved.
            className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm uppercase tracking-widest text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <span className="mt-2 block text-xs text-[var(--text-muted)]">
            Letters, numbers and dashes. Customers type this at checkout.
          </span>
        </label>

        <label className="block sm:w-32">
          <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
            Percent off
          </span>
          <input
            name="percentOff"
            required
            inputMode="numeric"
            placeholder="20"
            className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <span className="mt-2 block text-xs text-[var(--text-muted)]">1–100</span>
        </label>
      </div>

      {state && "error" in state && (
        <p className="mt-4 text-sm text-[var(--accent)]">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 flex min-h-11 items-center border border-[var(--border)] px-6 text-sm uppercase tracking-widest text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create code"}
      </button>
    </form>
  );
}
