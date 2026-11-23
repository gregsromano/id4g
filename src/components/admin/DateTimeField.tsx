"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A date-and-time box that reads "Choose date & time" while empty.
 *
 * A native datetime-local input can't have a placeholder — empty, it shows a
 * "mm/dd/yyyy, --:-- --" mask that reads like a date already filled in. So
 * while there's no value this renders a plain read-only text box with a real
 * placeholder, and swaps to the native picker the moment it's clicked or
 * focused (opening the picker straight away where the browser supports it).
 * Once a date is set it's the native input, with a Clear link beside it.
 *
 * `value` and `onChange` use the datetime-local format ("YYYY-MM-DDTHH:mm"),
 * same as the input itself.
 */
export default function DateTimeField({
  value,
  onChange,
  disabled,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Accessible name, e.g. "Starts". */
  label: string;
  className: string;
}) {
  const [editing, setEditing] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);

  // Right after swapping to the native input, focus it and open its picker,
  // so one click on "Choose date & time" behaves like one click on a date box.
  useEffect(() => {
    if (!editing) return;
    const input = pickerRef.current;
    if (!input) return;
    input.focus();
    try {
      input.showPicker?.();
    } catch {
      // showPicker throws outside a user gesture in some browsers; the
      // focused input is still usable by keyboard or a second click.
    }
  }, [editing]);

  if (!value && !editing) {
    return (
      <input
        type="text"
        readOnly
        aria-label={label}
        placeholder="Choose date & time"
        disabled={disabled}
        onFocus={() => setEditing(true)}
        onClick={() => setEditing(true)}
        className={`${className} cursor-pointer`}
      />
    );
  }

  return (
    <div>
      <input
        ref={pickerRef}
        type="datetime-local"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        disabled={disabled}
        className={className}
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            setEditing(false);
          }}
          className="mt-1 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
        >
          Clear
        </button>
      )}
    </div>
  );
}
