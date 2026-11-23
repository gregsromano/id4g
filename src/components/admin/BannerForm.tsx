"use client";

import { startTransition, useActionState, useState, useSyncExternalStore } from "react";

import { saveBannerAction, type BannerState } from "@/app/(admin)/admin/menu/actions";
import type { AnnouncementBanner } from "@/lib/settings";
import {
  formatWhen,
  isoToLocalInput,
  localInputToIso,
  localTimeZoneName,
  windowStatus,
} from "@/lib/schedule";

const inputClass =
  "w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] disabled:opacity-40";

/**
 * The announcement banner under the storefront menu: its text, an optional
 * start and end, and a live preview.
 *
 * Same timezone handling as SaleFields — the visible date pickers have no
 * `name`; each is converted in the browser to an exact ISO moment in a
 * hidden input, since the server runs in UTC — and the pickers are only
 * filled after mount, when the browser's timezone is known.
 */
export default function BannerForm({
  banner,
  maxLength,
}: {
  banner: AnnouncementBanner;
  maxLength: number;
}) {
  const [state, action, pending] = useActionState<BannerState, FormData>(saveBannerAction, null);
  const [text, setText] = useState(banner.text ?? "");
  const [startIso, setStartIso] = useState(banner.startsAt ?? "");
  const [endIso, setEndIso] = useState(banner.endsAt ?? "");
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const endError =
    startIso && endIso && Date.parse(endIso) <= Date.parse(startIso)
      ? "The banner has to end after it starts."
      : null;

  // "Remove banner" clears the fields and saves straight away — removing it
  // is the whole intent, so it shouldn't need a second click on Save. An
  // empty submission is what clears the banner server-side.
  function removeBanner() {
    setText("");
    setStartIso("");
    setEndIso("");
    startTransition(() => action(new FormData()));
  }

  // What shoppers see right now, from the SAVED banner.
  const status = mounted && banner.text ? windowStatus(banner.startsAt, banner.endsAt) : null;
  const timeZone = mounted ? localTimeZoneName() : null;
  const hasText = text.trim().length > 0;

  return (
    <form action={action} className="mt-8 border border-[var(--border)] p-5">
      <h2 className="!text-base !normal-case text-[var(--text-primary)]">Banner under the menu</h2>
      <p className="mt-1 max-w-prose text-sm text-[var(--text-muted)]">
        A strip of text right under the site&rsquo;s menu, on every page. It stays put while
        the page scrolls.
      </p>

      {status && banner.text && (
        <p
          className={`mt-4 border-l-2 pl-3 text-sm ${
            status === "live"
              ? "border-[var(--accent)] text-[var(--text-primary)]"
              : "border-[var(--border)] text-[var(--text-muted)]"
          }`}
        >
          {status === "live" && (
            <>
              <strong className="text-[var(--accent)]">Showing now</strong>
              {banner.endsAt ? ` until ${formatWhen(banner.endsAt)}` : " until you remove it"}.
            </>
          )}
          {status === "scheduled" && banner.startsAt && (
            <>
              <strong className="text-[var(--text-primary)]">Scheduled</strong> — starts{" "}
              {formatWhen(banner.startsAt)}
              {banner.endsAt ? `, ends ${formatWhen(banner.endsAt)}` : ""}.
            </>
          )}
          {status === "ended" && banner.endsAt && (
            <>
              <strong className="text-[var(--text-primary)]">Ended</strong>{" "}
              {formatWhen(banner.endsAt)} — it&rsquo;s no longer showing.
            </>
          )}
        </p>
      )}

      <label className="mt-4 block">
        <span className="mb-2 flex justify-between text-xs uppercase tracking-widest text-[var(--text-muted)]">
          <span>Text</span>
          <span>
            {text.length}/{maxLength}
          </span>
        </span>
        <textarea
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={maxLength}
          rows={2}
          placeholder="Free shipping on all hoodies this weekend"
          className={inputClass}
        />
      </label>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
            Starts
          </span>
          <input
            type="datetime-local"
            value={mounted ? isoToLocalInput(startIso || null) : ""}
            onChange={(e) => setStartIso(localInputToIso(e.target.value))}
            disabled={!hasText}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
            Ends
          </span>
          <input
            type="datetime-local"
            value={mounted ? isoToLocalInput(endIso || null) : ""}
            onChange={(e) => setEndIso(localInputToIso(e.target.value))}
            disabled={!hasText}
            className={inputClass}
          />
        </label>
      </div>
      <input type="hidden" name="starts_at" value={hasText ? startIso : ""} />
      <input type="hidden" name="ends_at" value={hasText ? endIso : ""} />

      <p className="mt-2 text-xs text-[var(--text-muted)]">
        Blank start = shows as soon as you save. Blank end = shows until you remove it.
        {timeZone ? ` Times are ${timeZone}.` : ""}
      </p>

      {hasText && (
        <div className="mt-4">
          <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
            Preview
          </span>
          <p className="bg-[var(--accent)] px-6 py-2.5 text-center text-xs font-bold uppercase tracking-widest text-[var(--on-accent)] sm:text-sm">
            {text.trim()}
          </p>
        </div>
      )}

      {endError && <p className="mt-3 text-sm text-red-400">{endError}</p>}
      {state && "error" in state && <p className="mt-3 text-sm text-red-400">{state.error}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending || !!endError} className="btn-primary !py-3">
          {pending ? "Saving…" : hasText ? "Save banner" : "Save"}
        </button>
        {banner.text && (
          <button
            type="button"
            onClick={removeBanner}
            disabled={pending}
            className="min-h-11 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)] disabled:opacity-50"
          >
            Remove banner
          </button>
        )}
        {state && "ok" in state && !pending && (
          <span className="text-xs uppercase tracking-widest text-[var(--accent)]">Saved</span>
        )}
      </div>
    </form>
  );
}
