"use client";

import { useActionState } from "react";

import { importTracking, type ImportResult } from "@/app/(admin)/admin/actions";

export default function ImportTrackingForm() {
  const [state, action, pending] = useActionState<ImportResult | null, FormData>(
    importTracking,
    null,
  );

  return (
    <form action={action} className="mt-6 border border-[var(--border)] p-6">
      <span className="section-label">Pirate Ship export</span>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
          Upload CSV
        </span>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          className="w-full text-sm text-[var(--text-body)] file:mr-4 file:border file:border-[var(--border)] file:bg-[var(--bg-section-alt)] file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-widest file:text-[var(--text-body)]"
        />
      </label>

      <label className="mt-6 block">
        <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
          ...or paste the CSV
        </span>
        <textarea
          name="csv"
          rows={8}
          placeholder="Order ID,Tracking Number,Carrier&#10;..."
          className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <button type="submit" disabled={pending} className="btn-primary mt-6">
        {pending ? "Importing..." : "Import tracking"}
      </button>

      {state && (
        <div
          className={`mt-6 border p-4 text-sm ${
            state.ok ? "border-[var(--border)]" : "border-red-400"
          }`}
        >
          <p className={state.ok ? "text-[var(--text-primary)]" : "text-red-400"}>
            {state.message}
          </p>

          {/* Report partial results explicitly — a silent partial success on a
              bulk update is how orders quietly go unshipped. */}
          {state.ok && (
            <ul className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
              <li>{state.updated} updated</li>
              {state.skipped > 0 && (
                <li>{state.skipped} row(s) skipped — no order id or tracking number</li>
              )}
              {state.notFound.length > 0 && (
                <li className="text-red-400">
                  {state.notFound.length} order id(s) not found:{" "}
                  {state.notFound.slice(0, 5).join(", ")}
                  {state.notFound.length > 5 && "..."}
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
