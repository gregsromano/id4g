"use client";

import { useActionState } from "react";

import { updateEmailAction, type ProfileActionResult } from "./actions";

export default function EmailForm() {
  const [state, action, pending] = useActionState<ProfileActionResult | null, FormData>(
    updateEmailAction,
    null,
  );

  return (
    <form action={action} className="mt-4">
      <label className="mb-4 block">
        <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
          New email
        </span>
        <input
          type="email"
          name="email"
          required
          className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="mb-4 block">
        <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
          Current password
        </span>
        <input
          type="password"
          name="current_password"
          autoComplete="current-password"
          required
          className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </label>

      {state && "error" in state && <p className="mb-4 text-sm text-red-400">{state.error}</p>}
      {state && "ok" in state && (
        <p className="mb-4 text-sm text-[var(--accent)]">Email updated.</p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving..." : "Update email"}
      </button>
    </form>
  );
}
