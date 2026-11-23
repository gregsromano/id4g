"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { formatPrice, saleStatus, type SaleWindow } from "@/lib/product";
import { formatWhen, isoToLocalInput, localInputToIso, localTimeZoneName } from "@/lib/schedule";
import { useDirty } from "./UnsavedChangesForm";

const inputClass =
  "w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]";

/**
 * Sale price plus an optional start and end, inside the product editor's
 * main form so the one Save button persists it.
 *
 * The visible date pickers carry no `name`. A datetime-local value has no
 * timezone and the server runs in UTC, so the browser converts each one to
 * an exact ISO moment into a hidden input instead — 9:00 PM typed in
 * California stays 9:00 PM California. The pickers are filled after mount
 * for the same reason: only the browser knows which timezone to show.
 *
 * Mistakes (a sale price at or above the base price, an end before the
 * start) are flagged with setCustomValidity, which stops the Save submit in
 * the browser with the message on the field — rather than letting the
 * server action throw and replace the page with an error.
 */
export default function SaleFields({
  salePriceCents,
  saleStartsAt,
  saleEndsAt,
  saleShippingCents,
  regularPriceCents,
}: SaleWindow & { saleShippingCents: number | null; regularPriceCents: number }) {
  const dirtyCtx = useDirty();
  const priceRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  const [price, setPrice] = useState(salePriceCents === null ? "" : (salePriceCents / 100).toFixed(2));
  const [shipping, setShipping] = useState(
    saleShippingCents === null ? "" : (saleShippingCents / 100).toFixed(2),
  );
  const [startIso, setStartIso] = useState(saleStartsAt ?? "");
  const [endIso, setEndIso] = useState(saleEndsAt ?? "");
  const [priceError, setPriceError] = useState<string | null>(null);
  const [endError, setEndError] = useState<string | null>(null);

  // False during the server render and hydration, true after: the date
  // pickers and status line depend on the browser's timezone and clock.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Re-validate whenever a value changes. The base price is read live from
  // the form's own "price" field, so raising or lowering it in the same
  // edit is taken into account.
  useEffect(() => {
    const priceInput = priceRef.current;
    const endInput = endRef.current;
    if (!priceInput || !endInput) return;

    let nextPriceError: string | null = null;
    if (price.trim()) {
      const cents = Math.round(Number(price) * 100);
      const baseField = priceInput.form?.elements.namedItem("price");
      const baseCents =
        baseField instanceof HTMLInputElement && baseField.value.trim()
          ? Math.round(Number(baseField.value) * 100)
          : regularPriceCents;
      if (!Number.isFinite(cents) || cents < 50) {
        nextPriceError = "Enter a sale price of at least $0.50.";
      } else if (Number.isFinite(baseCents) && cents >= baseCents) {
        nextPriceError = `The sale price has to be below the base price (${formatPrice(baseCents)}).`;
      }
    }
    priceInput.setCustomValidity(nextPriceError ?? "");
    setPriceError(nextPriceError);

    const nextEndError =
      startIso && endIso && Date.parse(endIso) <= Date.parse(startIso)
        ? "The sale has to end after it starts."
        : null;
    endInput.setCustomValidity(nextEndError ?? "");
    setEndError(nextEndError);
  }, [price, startIso, endIso, regularPriceCents]);

  function clearSale() {
    setPrice("");
    setShipping("");
    setStartIso("");
    setEndIso("");
    // Programmatic changes don't fire the form's native change event.
    dirtyCtx?.setDirty(true);
  }

  // Status of what is SAVED — i.e. what shoppers see right now.
  const saved: SaleWindow = { salePriceCents, saleStartsAt, saleEndsAt };
  const status = mounted ? saleStatus(saved) : null;
  const timeZone = mounted ? localTimeZoneName() : null;

  return (
    <div>
      {status && status !== "none" && salePriceCents !== null && (
        <p
          className={`mb-4 border-l-2 pl-3 text-sm ${
            status === "live"
              ? "border-[var(--accent)] text-[var(--text-primary)]"
              : "border-[var(--border)] text-[var(--text-muted)]"
          }`}
        >
          {status === "live" && (
            <>
              <strong className="text-[var(--accent)]">On sale now</strong> at{" "}
              {formatPrice(salePriceCents)}
              {saleShippingCents === null
                ? ""
                : saleShippingCents === 0
                  ? " with free shipping"
                  : ` with ${formatPrice(saleShippingCents)} shipping`}
              {saleEndsAt ? ` until ${formatWhen(saleEndsAt)}` : " until you remove it"}.
            </>
          )}
          {status === "scheduled" && saleStartsAt && (
            <>
              <strong className="text-[var(--text-primary)]">Scheduled</strong> —{" "}
              {formatPrice(salePriceCents)} starts {formatWhen(saleStartsAt)}
              {saleEndsAt ? `, ends ${formatWhen(saleEndsAt)}` : ""}.
            </>
          )}
          {status === "ended" && saleEndsAt && (
            <>
              <strong className="text-[var(--text-primary)]">Ended</strong>{" "}
              {formatWhen(saleEndsAt)} — the regular price is showing again.
            </>
          )}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
            Sale price (USD)
          </span>
          <input
            ref={priceRef}
            name="sale_price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="No sale"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
            Sale shipping (USD)
          </span>
          <input
            name="sale_shipping"
            value={price.trim() ? shipping : ""}
            onChange={(e) => {
              setShipping(e.target.value);
              const n = Number(e.target.value);
              e.target.setCustomValidity(
                e.target.value.trim() && (!Number.isFinite(n) || n < 0)
                  ? "Enter a shipping price of $0 or more, or leave it blank."
                  : "",
              );
            }}
            disabled={!price.trim()}
            inputMode="decimal"
            placeholder="Normal shipping"
            className={`${inputClass} disabled:opacity-40`}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
            Starts
          </span>
          <input
            type="datetime-local"
            value={mounted ? isoToLocalInput(startIso || null) : ""}
            onChange={(e) => setStartIso(localInputToIso(e.target.value))}
            disabled={!price.trim()}
            className={`${inputClass} disabled:opacity-40`}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
            Ends
          </span>
          <input
            ref={endRef}
            type="datetime-local"
            value={mounted ? isoToLocalInput(endIso || null) : ""}
            onChange={(e) => setEndIso(localInputToIso(e.target.value))}
            disabled={!price.trim()}
            className={`${inputClass} disabled:opacity-40`}
          />
        </label>
      </div>

      <input type="hidden" name="sale_starts_at" value={price.trim() ? startIso : ""} />
      <input type="hidden" name="sale_ends_at" value={price.trim() ? endIso : ""} />

      {priceError && <p className="mt-2 text-sm text-red-400">{priceError}</p>}
      {endError && <p className="mt-2 text-sm text-red-400">{endError}</p>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-muted)]">
          Blank start = starts as soon as you save. Blank end = runs until you remove it.
          {timeZone ? ` Times are ${timeZone}.` : ""} Every size sells at the sale price
          (never above its regular price), and the regular price returns on its own at the
          end time. Sale shipping: enter 0 for free shipping during the sale, or leave it
          blank to keep normal shipping.
        </p>
        {(price || startIso || endIso) && (
          <button
            type="button"
            onClick={clearSale}
            className="min-h-11 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
          >
            Remove sale
          </button>
        )}
      </div>
    </div>
  );
}
