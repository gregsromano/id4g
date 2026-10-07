"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setEmailPopupAction } from "@/app/(admin)/admin/email/actions";

/**
 * On/off switch for the homepage email popup.
 *
 * Same shape as the two shuffle toggles — optimistic, rolling back if the
 * save fails so a setting that did not stick can never look like one that
 * did — with `router.refresh()` alongside the action's revalidatePath,
 * because this calls the action directly rather than submitting a form.
 */
export default function EmailPopupToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !on;
    setOn(next);
    setError(null);

    startTransition(async () => {
      const result = await setEmailPopupAction(next);
      if (result && "error" in result) {
        setOn(!next); // roll back to what the server still has
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-8 border border-[var(--border)] p-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="!text-base !normal-case text-[var(--text-primary)]">
            Show the signup popup
          </h2>
          <p className="mt-1 max-w-prose text-sm text-[var(--text-muted)]">
            {on
              ? "Visitors see the popup 5 seconds after landing on the homepage, once each. Giving an email returns a one-time 15% off code."
              : "The popup is hidden and no new codes are handed out. Codes already given still work until they are used or expire."}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Show the signup popup"
          onClick={toggle}
          disabled={pending}
          className={`relative mt-1 h-11 w-[72px] shrink-0 border transition-colors disabled:opacity-50 ${
            on
              ? "border-[var(--accent)] bg-[var(--accent)]/20"
              : "border-[var(--border)] bg-transparent"
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

      <p className="mt-4 text-xs uppercase tracking-widest text-[var(--text-muted)]">
        {pending ? "Saving…" : on ? "On — popup is live" : "Off — popup hidden"}
      </p>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
