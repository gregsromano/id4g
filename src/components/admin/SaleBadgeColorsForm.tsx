"use client";

import { useActionState, useState } from "react";

import {
  saveSaleBadgeColorsAction,
  type SaleBadgeState,
} from "@/app/(admin)/admin/products/settings-actions";
import { contrastRatio, DEFAULT_SALE_BADGE, type SaleBadgeColors } from "@/lib/banner-style";
import ColorField from "./ColorField";

/**
 * Colors of the SALE tag shown on product cards and product pages while a
 * product's sale is live. One setting for every tag, so sales look
 * consistent across the shop.
 */
export default function SaleBadgeColorsForm({ colors }: { colors: SaleBadgeColors }) {
  const [state, action, pending] = useActionState<SaleBadgeState, FormData>(
    saveSaleBadgeColorsAction,
    null,
  );
  const [bgColor, setBgColor] = useState(colors.bgColor);
  const [textColor, setTextColor] = useState(colors.textColor);
  const lowContrast = contrastRatio(bgColor, textColor) < 4.5;

  return (
    <form id="sale-tag-color" action={action} className="scroll-mt-6">
      <h2 className="!text-base !normal-case text-[var(--text-primary)]">Sale tag color</h2>
      <p className="mt-1 max-w-prose text-sm text-[var(--text-muted)]">
        The SALE tag on product cards and product pages while a product is on sale. Set a
        product&rsquo;s sale on its edit page.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <ColorField label="Tag color" name="bg_color" value={bgColor} onChange={setBgColor} />
        <ColorField label="Text color" name="text_color" value={textColor} onChange={setTextColor} />
        <div>
          <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
            Preview
          </span>
          <span
            className="inline-flex h-11 items-center px-3 text-xs font-bold uppercase tracking-widest"
            style={{ backgroundColor: bgColor, color: textColor }}
          >
            20% off sale
          </span>
        </div>
      </div>

      {lowContrast && (
        <p className="mt-2 text-xs text-amber-400">
          These two colors are close — the word SALE may be hard to read.
        </p>
      )}
      {state && "error" in state && <p className="mt-3 text-sm text-red-400">{state.error}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="btn-primary !py-3">
          {pending ? "Saving…" : "Save tag color"}
        </button>
        <button
          type="button"
          onClick={() => {
            setBgColor(DEFAULT_SALE_BADGE.bgColor);
            setTextColor(DEFAULT_SALE_BADGE.textColor);
          }}
          className="min-h-11 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
        >
          Reset to original
        </button>
        {state && "ok" in state && !pending && (
          <span className="text-xs uppercase tracking-widest text-[var(--accent)]">Saved</span>
        )}
      </div>
    </form>
  );
}
