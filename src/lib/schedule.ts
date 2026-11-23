/**
 * Start/end windows for things that switch on and off by date — product
 * sales and the announcement banner. Client-safe: the admin forms use the
 * datetime helpers in the browser, the storefront the status check on the
 * server.
 */

export type WindowStatus = "scheduled" | "live" | "ended";

/**
 * Where a start/end window stands at `now`. A null start means "already
 * started" and a null end "until removed". Start-inclusive, end-exclusive,
 * so at exactly the end time the thing is already off.
 */
export function windowStatus(
  startsAt: string | null,
  endsAt: string | null,
  now: number = Date.now(),
): WindowStatus {
  if (startsAt && now < Date.parse(startsAt)) return "scheduled";
  if (endsAt && now >= Date.parse(endsAt)) return "ended";
  return "live";
}

/** ISO timestamp -> "YYYY-MM-DDTHH:mm" in the browser's own timezone, for a datetime-local input. */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * The reverse. A datetime-local value is read in the browser's timezone —
 * the time Greg meant — and sent on as an exact moment, because the server
 * runs in UTC and would read a bare value as UTC.
 */
export function localInputToIso(value: string): string {
  if (!value) return "";
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? "" : new Date(ms).toISOString();
}

/** "Tue, Nov 24, 9:00 PM" in the browser's timezone. */
export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** The browser's short timezone name, e.g. "PST". */
export function localTimeZoneName(): string | undefined {
  return new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value;
}
