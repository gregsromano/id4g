"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useRef, useState, useSyncExternalStore, useTransition } from "react";

import {
  saveBannerAction,
  setBannerEnabledAction,
  type BannerState,
} from "@/app/(admin)/admin/menu/actions";
import {
  BANNER_FONTS,
  BANNER_SIZES,
  bannerPresentation,
  contrastRatio,
  DEFAULT_BANNER_STYLE,
  normalizeHex,
  type BannerFont,
  type BannerSize,
} from "@/lib/banner-style";
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
const labelClass = "mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]";

/**
 * The announcement banner under the storefront menu: an on/off switch, its
 * text, an optional start and end, its colors and type, and a live preview.
 *
 * The switch saves on its own the moment it's flipped (like the other admin
 * switches); everything else saves with "Save banner".
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
  const formRef = useRef<HTMLFormElement>(null);
  const [text, setText] = useState(banner.text ?? "");
  const [startIso, setStartIso] = useState(banner.startsAt ?? "");
  const [endIso, setEndIso] = useState(banner.endsAt ?? "");
  const [bgColor, setBgColor] = useState(banner.style.bgColor);
  const [textColor, setTextColor] = useState(banner.style.textColor);
  const [bold, setBold] = useState(banner.style.bold);
  const [size, setSize] = useState<BannerSize>(banner.style.size);
  const [font, setFont] = useState<BannerFont>(banner.style.font);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const endError =
    startIso && endIso && Date.parse(endIso) <= Date.parse(startIso)
      ? "The banner has to end after it starts."
      : null;

  // "Remove banner" clears the text and dates and saves straight away —
  // removing it is the whole intent. The style fields are still in the form,
  // so the colors and font stay for the next banner.
  function removeBanner() {
    setText("");
    setStartIso("");
    setEndIso("");
    const data = formRef.current ? new FormData(formRef.current) : new FormData();
    data.set("text", "");
    data.set("starts_at", "");
    data.set("ends_at", "");
    startTransition(() => action(data));
  }

  function resetStyle() {
    setBgColor(DEFAULT_BANNER_STYLE.bgColor);
    setTextColor(DEFAULT_BANNER_STYLE.textColor);
    setBold(DEFAULT_BANNER_STYLE.bold);
    setSize(DEFAULT_BANNER_STYLE.size);
    setFont(DEFAULT_BANNER_STYLE.font);
  }

  // What shoppers see right now, from the SAVED banner.
  const status = mounted && banner.text ? windowStatus(banner.startsAt, banner.endsAt) : null;
  const timeZone = mounted ? localTimeZoneName() : null;
  const hasText = text.trim().length > 0;
  const preview = bannerPresentation({ bgColor, textColor, bold, size, font });
  const lowContrast = contrastRatio(bgColor, textColor) < 4.5;

  return (
    <div className="mt-8 border border-[var(--border)] p-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="!text-base !normal-case text-[var(--text-primary)]">Banner under the menu</h2>
          <p className="mt-1 max-w-prose text-sm text-[var(--text-muted)]">
            A strip of text right under the site&rsquo;s menu, on every page. It stays put while
            the page scrolls.
          </p>
        </div>
        <EnabledSwitch enabled={banner.enabled} />
      </div>

      {!banner.enabled && banner.text && (
        <p className="mt-4 border-l-2 border-[var(--border)] pl-3 text-sm text-[var(--text-muted)]">
          <strong className="text-[var(--text-primary)]">Switched off</strong> — the banner is
          hidden. Its text, dates and style are kept for when you switch it back on.
        </p>
      )}

      {banner.enabled && status && banner.text && (
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

      <form ref={formRef} action={action}>
        <label className="mt-4 block">
          <span className={`${labelClass} flex justify-between`}>
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
            <span className={labelClass}>Starts</span>
            <input
              type="datetime-local"
              value={mounted ? isoToLocalInput(startIso || null) : ""}
              onChange={(e) => setStartIso(localInputToIso(e.target.value))}
              disabled={!hasText}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Ends</span>
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

        <fieldset className="mt-6 border-t border-[var(--border)] pt-5">
          <legend className="sr-only">Style</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField label="Banner color" name="bg_color" value={bgColor} onChange={setBgColor} />
            <ColorField label="Text color" name="text_color" value={textColor} onChange={setTextColor} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block">
              <span className={labelClass}>Font</span>
              <select
                name="font"
                value={font}
                onChange={(e) => setFont(e.target.value as BannerFont)}
                className={`${inputClass} h-11`}
              >
                {Object.entries(BANNER_FONTS).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Size</span>
              <select
                name="font_size"
                value={size}
                onChange={(e) => setSize(e.target.value as BannerSize)}
                className={`${inputClass} h-11`}
              >
                {Object.entries(BANNER_SIZES).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex h-11 cursor-pointer items-center gap-3 border border-[var(--border)] px-4 text-sm text-[var(--text-primary)]">
              <input
                type="checkbox"
                name="bold"
                checked={bold}
                onChange={(e) => setBold(e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              <span className="font-bold">Bold</span>
            </label>
          </div>
          {font === "block" && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Bebas Neue only comes in one weight, so Bold doesn&rsquo;t change it.
            </p>
          )}
          <button
            type="button"
            onClick={resetStyle}
            className="mt-3 min-h-11 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
          >
            Reset to original look
          </button>
        </fieldset>

        <div className="mt-4">
          <span className={labelClass}>Preview</span>
          <p className={preview.className} style={preview.style}>
            {text.trim() || "Your banner text"}
          </p>
          {lowContrast && (
            <p className="mt-2 text-xs text-amber-400">
              These two colors are close — the text may be hard to read on some screens.
            </p>
          )}
        </div>

        {endError && <p className="mt-3 text-sm text-red-400">{endError}</p>}
        {state && "error" in state && <p className="mt-3 text-sm text-red-400">{state.error}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button type="submit" disabled={pending || !!endError} className="btn-primary !py-3">
            {pending ? "Saving…" : "Save banner"}
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
    </div>
  );
}

/**
 * A color wheel and a hex box for the same color. The wheel is the
 * browser's own picker (a color wheel on Mac); the hex box accepts
 * "#24E0FF", "24e0ff" or "#2ef" and only updates the color once it's a
 * valid code, so a half-typed value never reaches the form.
 */
function ColorField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [draft, setDraft] = useState(value.toUpperCase());
  const [lastValue, setLastValue] = useState(value);
  // Follow outside changes (the wheel, "Reset") without an effect.
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value.toUpperCase());
  }
  const valid = normalizeHex(draft) !== null;

  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} — color wheel`}
          className="h-11 w-14 shrink-0 cursor-pointer border border-[var(--border)] bg-transparent p-1"
        />
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            const hex = normalizeHex(e.target.value);
            if (hex) onChange(hex);
          }}
          onBlur={() => setDraft(value.toUpperCase())}
          aria-label={`${label} — hex code`}
          aria-invalid={!valid}
          spellCheck={false}
          maxLength={7}
          className={`${inputClass} h-11 font-mono uppercase ${valid ? "" : "!border-red-400"}`}
        />
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

/** On/off switch that saves immediately, rolling back if the save fails. */
function EnabledSwitch({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !on;
    setOn(next);
    setError(null);
    startSaving(async () => {
      const result = await setBannerEnabledAction(next);
      if (result && "error" in result) {
        setOn(!next);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Show the banner"
        onClick={toggle}
        disabled={saving}
        className={`relative h-11 w-[72px] border transition-colors disabled:opacity-50 ${
          on ? "border-[var(--accent)] bg-[var(--accent)]/20" : "border-[var(--border)] bg-transparent"
        }`}
      >
        <span
          className={`absolute top-1/2 h-8 w-8 -translate-y-1/2 transition-all ${
            on ? "left-[34px] bg-[var(--accent)]" : "left-1 bg-[var(--text-muted)]"
          }`}
        />
      </button>
      <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
        {saving ? "Saving…" : on ? "On" : "Off"}
      </span>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
