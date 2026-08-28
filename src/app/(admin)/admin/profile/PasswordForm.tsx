"use client";

import { useActionState, useRef } from "react";

import { updatePasswordAction, type ProfileActionResult } from "./actions";

export default function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ProfileActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await updatePasswordAction(prev, formData);
      if ("ok" in result) formRef.current?.reset();
      return result;
    },
    null,
  );

  return (
    <form ref={formRef} action={action} className="mt-4">
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

      <label className="mb-4 block">
        <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
          New password
        </span>
        <input
          type="password"
          name="new_password"
          autoComplete="new-password"
          minLength={8}
          required
          className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="mb-4 block">
        <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
          Confirm new password
        </span>
        <input
          type="password"
          name="confirm_password"
          autoComplete="new-password"
          minLength={8}
          required
          className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </label>

      {state && "error" in state && <p className="mb-4 text-sm text-red-400">{state.error}</p>}
      {state && "ok" in state && (
        <p className="mb-4 text-sm text-[var(--accent)]">Password updated.</p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving..." : "Update password"}
      </button>
    </form>
  );
}
