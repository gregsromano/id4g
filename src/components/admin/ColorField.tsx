"use client";

import { useState } from "react";

import { normalizeHex } from "@/lib/banner-style";

const inputClass =
  "w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]";
const labelClass = "mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]";

/**
 * A color wheel and a hex box for the same color. The wheel is the
 * browser's own picker (a color wheel on Mac); the hex box accepts
 * "#24E0FF", "24e0ff" or "#2ef" and only updates the color once it's a
 * valid code, so a half-typed value never reaches the form.
 */
export default function ColorField({
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
