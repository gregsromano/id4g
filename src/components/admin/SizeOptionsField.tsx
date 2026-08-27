"use client";

import { useState } from "react";

import { optionsToText, parseOptionsText, STANDARD_SIZES } from "@/lib/product-options";

/**
 * Size picker (pill toggles, not a native multi-select — much better UX for
 * choosing several from a short fixed list, and matches the size picker
 * already used on the storefront) for the "options" field, replacing typing
 * "Size: S, M, L" by hand. Any OTHER option dimension (Color, etc.) still
 * goes in the free-text area below — this only structures the common case.
 *
 * Composes both into the same "Name: v1, v2" text format the rest of the
 * app already parses (parseOptionsText), via a hidden input — no server-side
 * changes needed.
 */
export default function SizeOptionsField({
  name,
  defaultValue,
}: {
  name: string;
  /** Omit entirely (new product) to default to Small selected. */
  defaultValue?: string;
}) {
  const initialOptions = parseOptionsText(defaultValue ?? "");
  const sizeOption = initialOptions.find((o) => o.name.toLowerCase() === "size");
  const otherOptions = initialOptions.filter((o) => o.name.toLowerCase() !== "size");

  const [selectedSizes, setSelectedSizes] = useState<string[]>(() => {
    if (sizeOption) return sizeOption.values;
    return defaultValue === undefined ? ["S"] : [];
  });
  const [otherText, setOtherText] = useState(optionsToText(otherOptions));

  function toggleSize(value: string) {
    setSelectedSizes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  const combinedText = [
    selectedSizes.length > 0 ? `Size: ${selectedSizes.join(", ")}` : null,
    otherText.trim() || null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return (
    <div>
      <input type="hidden" name={name} value={combinedText} />

      <div className="flex flex-wrap gap-2">
        {STANDARD_SIZES.map((size) => {
          const active = selectedSizes.includes(size.value);
          return (
            <label
              key={size.value}
              className={`cursor-pointer border px-3 py-1.5 text-xs uppercase tracking-widest transition-colors ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]"
                  : "border-[var(--border)] text-[var(--text-body)] hover:border-[var(--gold)]"
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggleSize(size.value)}
                className="sr-only"
              />
              {size.label}
            </label>
          );
        })}
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
          Other options (optional)
        </span>
        <textarea
          rows={2}
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          placeholder="Color: Black, White"
          className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </label>
    </div>
  );
}
