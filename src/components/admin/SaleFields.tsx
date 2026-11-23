"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";

import {
  setProductSaleEnabledAction,
  turnOnProductSaleAction,
} from "@/app/(admin)/admin/products/actions";

import { formatPrice, saleStatus, type SaleWindow } from "@/lib/product";
import { formatWhen, isoToLocalInput, localInputToIso, localTimeZoneName } from "@/lib/schedule";
import DateTimeField from "./DateTimeField";
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
  saleEnabled = true,
  regularPriceCents,
  productId,
}: SaleWindow & {
  saleShippingCents: number | null;
  regularPriceCents: number;
  productId: string;
}) {
  const dirtyCtx = useDirty();
  const priceRef = useRef<HTMLInputElement>(null);

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
    if (!priceInput) return;

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
    setPriceError(nextPriceError);

    const nextEndError =
      startIso && endIso && Date.parse(endIso) <= Date.parse(startIso)
        ? "The sale has to end after it starts."
        : null;
    setEndError(nextEndError);

    // Both problems block Save through the price field: the date boxes swap
    // between a text box and the native picker (see DateTimeField), so the
    // price input is the one stable field to hang the browser's message on.
    priceInput.setCustomValidity(nextPriceError ?? nextEndError ?? "");
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
  const saved: SaleWindow = { salePriceCents, saleStartsAt, saleEndsAt, saleEnabled };
  const status = mounted ? saleStatus(saved) : null;
  const timeZone = mounted ? localTimeZoneName() : null;

  return (
    <div>
      {/* Keyed on the saved state so it re-syncs after a save or refresh. */}
      <SaleSwitch
        key={`${saleEnabled}-${salePriceCents}`}
        productId={productId}
        enabled={saleEnabled && salePriceCents !== null}
        draft={{ price, shipping, startsAt: startIso, endsAt: endIso }}
      />

      {status === "off" && salePriceCents !== null && (
        <p className="mb-4 border-l-2 border-[var(--border)] pl-3 text-sm text-[var(--text-muted)]">
          <strong className="text-[var(--text-primary)]">Sale is off</strong> — the regular price
          is showing. Switch it on to bring back the {formatPrice(salePriceCents)} sale
          {saleStartsAt || saleEndsAt ? " (its dates still apply)" : " right away"}.
        </p>
      )}

      {status && status !== "none" && status !== "off" && salePriceCents !== null && (
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
              {saleEndsAt ? ` until ${formatWhen(saleEndsAt)}` : " until you switch it off"}.
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
          <DateTimeField
            label="Starts"
            value={mounted ? isoToLocalInput(startIso || null) : ""}
            onChange={(v) => {
              setStartIso(localInputToIso(v));
              dirtyCtx?.setDirty(true);
            }}
            disabled={!price.trim()}
            className={`${inputClass} disabled:opacity-40`}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
            Ends
          </span>
          <DateTimeField
            label="Ends"
            value={mounted ? isoToLocalInput(endIso || null) : ""}
            onChange={(v) => {
              setEndIso(localInputToIso(v));
              dirtyCtx?.setDirty(true);
            }}
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
          Dates are optional — leave both blank and just use the switch. Blank start = starts right away; blank end = runs until you switch it off.
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

/**
 * The sale's on/off switch. Saves the moment it's flipped (its own server
 * action, not the main Save). Turning it ON also saves the sale price,
 * shipping and dates currently typed in, so a sale with no dates is just:
 * type a price, flip it on. It's a plain button, so flipping it doesn't mark
 * the edit form as unsaved.
 */
function SaleSwitch({
  productId,
  enabled,
  draft,
}: {
  productId: string;
  enabled: boolean;
  draft: { price: string; shipping: string; startsAt: string; endsAt: string };
}) {
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !on;
    setOn(next);
    setError(null);
    startSaving(async () => {
      const result = next
        ? await turnOnProductSaleAction(productId, draft)
        : await setProductSaleEnabledAction(productId, false);
      if ("error" in result) {
        setOn(!next); // roll back to what the server still has
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-4 border border-[var(--border)] p-4">
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">Sale on / off</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          {saving
            ? "Saving…"
            : on
              ? "On — no dates needed. Switch off any time; the sale stays saved."
              : "Off — type a sale price below and flip this on. No Save or dates needed."}
        </p>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Sale on or off"
        onClick={toggle}
        disabled={saving}
        className={`relative h-11 w-[72px] shrink-0 border transition-colors disabled:opacity-40 ${
          on ? "border-[var(--accent)] bg-[var(--accent)]/20" : "border-[var(--border)] bg-transparent"
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
  );
}
