"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  createDiscountAction,
  type CreateDiscountState,
} from "@/app/(admin)/admin/discounts/actions";

/**
 * Create a discount code.
 *
 * Percent-off is the only discount type this store offers, so there is no
 * type selector to choose wrong. The three limits below it are all optional
 * and all blank by default, so the simple case stays two fields.
 *
 * They have to be set HERE: Stripe makes `max_redemptions` and `expires_at`
 * create-only, so a code made without them can never gain them later.
 */
export default function NewDiscountForm() {
  const [state, action, pending] = useActionState<CreateDiscountState, FormData>(
    createDiscountAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  /**
   * Stamp the browser's UTC offset onto each date before it is submitted.
   *
   * A `datetime-local` value carries no timezone, and the server parses it in
   * ITS timezone — UTC on Vercel. Sent bare, a sale typed as 9am would start
   * at 2am Pacific. Appending the offset here makes the value mean the time
   * the person actually typed.
   */
  function withTimezone(formData: FormData): FormData {
    const offsetMinutes = -new Date().getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const abs = Math.abs(offsetMinutes);
    const pad = (n: number) => String(n).padStart(2, "0");
    const suffix = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;

    for (const field of ["startsAt", "expiresAt"]) {
      const value = String(formData.get(field) ?? "").trim();
      if (value) formData.set(field, `${value}${suffix}`);
    }
    return formData;
  }

  // Clear the fields after a successful create so the next code starts from
  // an empty form rather than the previous one's text, which is easy to
  // submit again by accident.
  useEffect(() => {
    if (state && "ok" in state) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={(formData) => action(withTimezone(formData))}
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

      {/* Optional limits. Stripe cannot add any of these to an existing
          code, so a blank here is permanent for this code. */}
      <fieldset className="mt-6 border-t border-[var(--border)] pt-6">
        <legend className="sr-only">Limits</legend>
        <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
          Limits (optional)
        </p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          These cannot be added or changed after the code is created — leave
          blank for unlimited.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2 sm:max-w-[12rem]">
            <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Total uses
            </span>
            <input
              name="maxRedemptions"
              inputMode="numeric"
              placeholder="25"
              autoComplete="off"
              className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <span className="mt-2 block text-xs text-[var(--text-muted)]">
              Stops working after this many orders.
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Starts
            </span>
            <input
              type="datetime-local"
              name="startsAt"
              className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <span className="mt-2 block text-xs text-[var(--text-muted)]">
              Blank = works immediately.
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Ends
            </span>
            <input
              type="datetime-local"
              name="expiresAt"
              className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <span className="mt-2 block text-xs text-[var(--text-muted)]">
              Blank = never expires.
            </span>
          </label>
        </div>
      </fieldset>

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
