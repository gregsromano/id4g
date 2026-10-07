"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Homepage email capture: address in, one-time 15% code out.
 *
 * Shown once per visitor and then remembered in localStorage, so it is not
 * a toll gate on every page view. That memory is per-browser and can come
 * back empty (private windows, cleared data, a blocked accessor throwing),
 * which is why every read and write is wrapped — the worst case is that
 * someone sees the popup a second time, never that the page fails to render.
 *
 * The SERVER still decides who gets a code: a visitor who clears storage and
 * submits the same address again gets the SAME code back, because the
 * subscriber table is keyed by email.
 */

const SEEN_KEY = "id4g_email_popup_seen";
const DELAY_MS = 5000;

function hasSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Private mode or blocked storage: showing it again next visit is an
    // acceptable outcome, a crash is not.
  }
}

type Status = "idle" | "sending" | "done" | "error";

export default function EmailPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [code, setCode] = useState<string | null>(null);
  const [repeat, setRepeat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasSeen()) return;
    const timer = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    // Marked on close rather than on open: someone who never saw it (tab in
    // the background, closed the page early) should still get a chance.
    markSeen();
  }, []);

  // Escape closes, and focus moves into the dialog so a keyboard or screen
  // reader user is not left behind on the page underneath.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;

    setStatus("sending");
    setError(null);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, smsConsent }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setCode(data.code);
      setRepeat(Boolean(data.alreadySubscribed));
      setStatus("done");
      markSeen();
    } catch {
      setError("Could not reach the server. Please try again.");
      setStatus("error");
    }
  }

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be denied; the code is on screen to type either way.
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-popup-title"
      onClick={close}
      /* overflow-y-auto + items-start above sm: with the consent text shown
         and a phone keyboard open, the panel can exceed a short screen, and a
         centred flex child that overflows gets clipped at the TOP where
         scrolling cannot reach it. Scrolling the backdrop keeps Sign me up
         reachable on an iPhone SE. */
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:items-center"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="relative my-auto w-full max-w-md border border-[var(--border)] bg-[var(--bg-primary)] p-7 sm:p-9"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center text-2xl leading-none text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          &times;
        </button>

        {status === "done" && code ? (
          <div className="text-center">
            <span className="section-label">
              {repeat ? "Already on the list" : "You're in"}
            </span>
            <h2
              id="email-popup-title"
              className="!text-3xl mt-2 text-[var(--text-primary)] sm:!text-4xl"
            >
              15% off
            </h2>
            <p className="mt-3 text-sm text-[var(--text-body)]">
              {repeat
                ? "You already have a code — here it is again."
                : "Use this code at checkout. One use, expires in 30 days."}
            </p>

            <button
              type="button"
              onClick={copyCode}
              className="mt-5 w-full border border-[var(--accent)] bg-[var(--accent)]/10 px-4 py-4 text-center font-mono text-lg tracking-widest text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/20"
            >
              {code}
            </button>
            <p className="mt-2 text-xs uppercase tracking-widest text-[var(--text-muted)]">
              {copied ? "Copied" : "Tap to copy"}
            </p>

            <button type="button" onClick={close} className="btn-primary mt-6 w-full">
              Start shopping
            </button>
          </div>
        ) : (
          <>
            <span className="section-label">Exclusive drops</span>
            <h2
              id="email-popup-title"
              className="!text-3xl mt-2 text-[var(--text-primary)] sm:!text-4xl"
            >
              Get 15% off
            </h2>
            <p className="mt-3 text-sm text-[var(--text-body)]">
              Join the list for early access to new drops and sales — and take 15% off
              your first order.
            </p>

            <form onSubmit={submit} className="mt-6">
              <label htmlFor="email-popup-input" className="sr-only">
                Email address
              </label>
              {/* Underline fields rather than boxes: lighter against the dark
                  panel, and the 16px text size is deliberate — anything
                  smaller makes iOS Safari zoom the page on focus. */}
              <input
                ref={inputRef}
                id="email-popup-input"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={status === "sending"}
                className="h-12 w-full border-0 border-b border-[var(--border)] bg-transparent px-1 text-base text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] disabled:opacity-50"
              />

              <label htmlFor="phone-popup-input" className="sr-only">
                Phone number (optional)
              </label>
              <input
                id="phone-popup-input"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number (optional)"
                disabled={status === "sending"}
                className="mt-4 h-12 w-full border-0 border-b border-[var(--border)] bg-transparent px-1 text-base text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] disabled:opacity-50"
              />

              {/* The consent box is only shown once a number has been typed:
                  an untouched checkbox above an empty field is noise, and
                  consenting with no number consents to nothing. */}
              {phone.trim().length > 0 && (
                <div className="mt-5 flex gap-3">
                  <input
                    id="sms-consent"
                    type="checkbox"
                    checked={smsConsent}
                    onChange={(e) => setSmsConsent(e.target.checked)}
                    disabled={status === "sending"}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--accent)]"
                  />
                  <label
                    htmlFor="sms-consent"
                    className="cursor-pointer text-xs leading-relaxed text-[var(--text-muted)]"
                  >
                    Text me about new drops. Recurring automated marketing texts;
                    consent is not a condition of purchase. Msg &amp; data rates may
                    apply. Reply STOP to opt out. See our{" "}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="text-[var(--accent)] underline-offset-2 hover:underline"
                    >
                      privacy policy
                    </Link>
                    .
                  </label>
                </div>
              )}

              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={status === "sending"}
                className="btn-primary mt-5 w-full"
              >
                {status === "sending" ? "Getting your code…" : "Sign me up"}
              </button>
            </form>

            <button
              type="button"
              onClick={close}
              className="mt-4 w-full py-2 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--text-body)]"
            >
              No thanks
            </button>
          </>
        )}
      </div>
    </div>
  );
}
