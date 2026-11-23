"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useSyncExternalStore, useTransition } from "react";

import {
  removeSitewideSaleAction,
  saveSitewideSaleAction,
  setSitewideSaleEnabledAction,
  type SitewideSaleState,
} from "@/app/(admin)/admin/products/settings-actions";
import { sitewideSaleStatus, type SitewideSale } from "@/lib/product";
import {
  formatWhen,
  isoToLocalInput,
  localInputToIso,
  localTimeZoneName,
} from "@/lib/schedule";

const inputClass =
  "w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] disabled:opacity-40";
const labelClass = "mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]";

/**
 * Percent off every product at once, with an on/off switch and optional
 * start and end times — the store-wide counterpart of a product's own sale.
 * Where both apply, the shopper gets whichever price is lower.
 *
 * The switch saves the moment it's flipped; percent and dates save with
 * "Save site-wide sale". Same timezone handling as SaleFields: the visible
 * date pickers have no `name` and are converted in the browser to exact ISO
 * moments in hidden inputs, since the server runs in UTC.
 */
export default function SitewideSaleForm({ sale }: { sale: SitewideSale }) {
  const [state, action, pending] = useActionState<SitewideSaleState, FormData>(
    saveSitewideSaleAction,
    null,
  );
  const [percent, setPercent] = useState(sale.percentOff === null ? "" : String(sale.percentOff));
  const [startIso, setStartIso] = useState(sale.startsAt ?? "");
  const [endIso, setEndIso] = useState(sale.endsAt ?? "");
  const [removing, startRemoving] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const router = useRouter();

  function removeSale() {
    if (!window.confirm("Remove the site-wide sale? Regular prices will show right away.")) return;
    setRemoveError(null);
    startRemoving(async () => {
      const result = await removeSitewideSaleAction();
      if (result && "error" in result) {
        setRemoveError(result.error);
        return;
      }
      setPercent("");
      setStartIso("");
      setEndIso("");
      router.refresh();
    });
  }

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const hasPercent = percent.trim().length > 0;
  const endError =
    startIso && endIso && Date.parse(endIso) <= Date.parse(startIso)
      ? "The sale has to end after it starts."
      : null;

  // What shoppers see right now, from what's SAVED.
  const status = mounted ? sitewideSaleStatus(sale) : null;
  const timeZone = mounted ? localTimeZoneName() : null;

  return (
    <div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="!text-base !normal-case text-[var(--text-primary)]">Site-wide sale</h2>
          <p className="mt-1 max-w-prose text-sm text-[var(--text-muted)]">
            A percent off every product at once. If a product also has its own sale, shoppers
            get whichever price is lower. Custom versions of one-of-ones keep their price.
          </p>
        </div>
        {/* Keyed on the saved state so Remove (which switches it off on the
            server) resets the switch instead of leaving it showing On. */}
        <EnabledSwitch
          key={`${sale.enabled}-${sale.percentOff}`}
          enabled={sale.enabled}
          hasSavedSale={sale.percentOff !== null}
        />
      </div>

      {status && (
        <p
          className={`mt-4 border-l-2 pl-3 text-sm ${
            status === "live"
              ? "border-[var(--accent)] text-[var(--text-primary)]"
              : "border-[var(--border)] text-[var(--text-muted)]"
          }`}
        >
          {status === "none" && (
            <>
              <strong className="text-[var(--text-primary)]">No site-wide sale.</strong> Enter a
              percent below, click Save, then switch it on.
            </>
          )}
          {status === "off" && (
            <>
              <strong className="text-[var(--text-primary)]">Off</strong> — regular prices are
              showing. Switch it on to start {sale.percentOff}% off everything
              {sale.startsAt || sale.endsAt ? " (its dates still apply)" : " right away"}.
            </>
          )}
          {status === "live" && (
            <>
              <strong className="text-[var(--accent)]">On now</strong> — {sale.percentOff}% off
              everything
              {sale.endsAt ? ` until ${formatWhen(sale.endsAt)}` : " until you switch it off"}.
            </>
          )}
          {status === "scheduled" && sale.startsAt && (
            <>
              <strong className="text-[var(--text-primary)]">Scheduled</strong> — {sale.percentOff}%
              off starts {formatWhen(sale.startsAt)}
              {sale.endsAt ? `, ends ${formatWhen(sale.endsAt)}` : ""}.
            </>
          )}
          {status === "ended" && sale.endsAt && (
            <>
              <strong className="text-[var(--text-primary)]">Ended</strong>{" "}
              {formatWhen(sale.endsAt)} — regular prices are back.
            </>
          )}
        </p>
      )}

      <form action={action} className="mt-4">
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr_1fr]">
          <label className="block">
            <span className={labelClass}>Percent off</span>
            <div className="relative">
              <input
                name="percent"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                inputMode="numeric"
                placeholder="20"
                className={`${inputClass} pr-8`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
                %
              </span>
            </div>
          </label>
          <label className="block">
            <span className={labelClass}>Starts</span>
            <input
              type="datetime-local"
              value={mounted ? isoToLocalInput(startIso || null) : ""}
              onChange={(e) => setStartIso(localInputToIso(e.target.value))}
              disabled={!hasPercent}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Ends</span>
            <input
              type="datetime-local"
              value={mounted ? isoToLocalInput(endIso || null) : ""}
              onChange={(e) => setEndIso(localInputToIso(e.target.value))}
              disabled={!hasPercent}
              className={inputClass}
            />
          </label>
        </div>
        <input type="hidden" name="starts_at" value={hasPercent ? startIso : ""} />
        <input type="hidden" name="ends_at" value={hasPercent ? endIso : ""} />

        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Dates are optional — leave both blank and just use the switch. Blank start = starts
          right away; blank end = runs until you switch it off.
          {timeZone ? ` Times are ${timeZone}.` : ""}
        </p>

        {endError && <p className="mt-3 text-sm text-red-400">{endError}</p>}
        {state && "error" in state && <p className="mt-3 text-sm text-red-400">{state.error}</p>}
        {removeError && <p className="mt-3 text-sm text-red-400">{removeError}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={pending || removing || !!endError}
            className="btn-primary !py-3"
          >
            {pending ? "Saving…" : "Save site-wide sale"}
          </button>
          {sale.percentOff !== null && (
            <button
              type="button"
              onClick={removeSale}
              disabled={pending || removing}
              className="btn-outline !py-3"
            >
              {removing ? "Removing…" : "Remove sale"}
            </button>
          )}
          {state && "ok" in state && !pending && (
            <span className="text-xs uppercase tracking-widest text-[var(--accent)]">Saved</span>
          )}
        </div>
      </form>
    </div>
  );
}

/** On/off switch that saves immediately, rolling back if the save fails. */
function EnabledSwitch({ enabled, hasSavedSale }: { enabled: boolean; hasSavedSale: boolean }) {
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !on;
    setOn(next);
    setError(null);
    startSaving(async () => {
      const result = await setSitewideSaleEnabledAction(next);
      if (result && "error" in result) {
        setOn(!next);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const shownOn = hasSavedSale && on;
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={shownOn}
        aria-label="Site-wide sale on or off"
        onClick={toggle}
        disabled={!hasSavedSale || saving}
        className={`relative h-11 w-[72px] border transition-colors disabled:opacity-40 ${
          shownOn ? "border-[var(--accent)] bg-[var(--accent)]/20" : "border-[var(--border)] bg-transparent"
        }`}
      >
        {/* 44px tall hit area: the admin's touch-target floor. */}
        <span
          className={`absolute top-1/2 h-8 w-8 -translate-y-1/2 transition-all ${
            shownOn ? "left-[34px] bg-[var(--accent)]" : "left-1 bg-[var(--text-muted)]"
          }`}
        />
      </button>
      <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
        {saving ? "Saving…" : shownOn ? "On" : "Off"}
      </span>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
