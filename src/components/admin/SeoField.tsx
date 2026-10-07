"use client";

import { useState } from "react";

/**
 * A meta title / description input with a live character count.
 *
 * The count is the point: search engines truncate a title around 60
 * characters and a description around 155, and the only way to write to that
 * budget is to see it while typing. The limit is advisory — going over is
 * allowed and simply means the tail gets cut in results, which is sometimes
 * a deliberate trade — so it warns rather than blocks or truncates.
 */
export default function SeoField({
  name,
  label,
  defaultValue,
  placeholder,
  recommended,
  multiline = false,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder: string;
  recommended: number;
  multiline?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const over = value.length > recommended;

  const inputClass =
    "w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]";

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <label
          htmlFor={`seo-${name}`}
          className="text-xs uppercase tracking-widest text-[var(--text-muted)]"
        >
          {label}
        </label>
        <span
          className={`text-xs tabular-nums ${
            over ? "text-amber-400" : "text-[var(--text-muted)]"
          }`}
        >
          {value.length}/{recommended}
          {over ? " — may be cut off" : ""}
        </span>
      </div>

      {multiline ? (
        <textarea
          id={`seo-${name}`}
          name={name}
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className={`${inputClass} resize-y`}
        />
      ) : (
        <input
          id={`seo-${name}`}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      )}
    </div>
  );
}
