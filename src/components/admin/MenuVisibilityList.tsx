"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setMenuItemHiddenAction } from "@/app/(admin)/admin/menu/actions";

type Item = { id: string; label: string; href: string };
type TopItem = Item & { children: Item[] };

/**
 * One on/off switch per storefront menu item, with the Shop dropdown's
 * sub-links nested under it.
 *
 * Same shape as EmailPopupToggle — optimistic, rolling back if the save
 * fails so a switch that did not stick can never look like one that did.
 * A sub-link's switch is disabled while its parent is hidden, since the
 * whole dropdown goes with the parent.
 */
export default function MenuVisibilityList({
  items,
  hidden,
}: {
  items: TopItem[];
  hidden: string[];
}) {
  const [hiddenIds, setHiddenIds] = useState(() => new Set(hidden));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function setHidden(id: string, hide: boolean) {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (hide) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggle(id: string) {
    const hide = !hiddenIds.has(id);
    setHidden(id, hide);
    setError(null);
    setSavingId(id);

    startTransition(async () => {
      const result = await setMenuItemHiddenAction(id, hide);
      setSavingId(null);
      if (result && "error" in result) {
        setHidden(id, !hide); // roll back to what the server still has
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-8 border border-[var(--border)]">
      {error && <p className="border-b border-[var(--border)] p-4 text-sm text-red-400">{error}</p>}

      <ul>
        {items.map((item) => {
          const parentHidden = hiddenIds.has(item.id);
          return (
            <li key={item.id} className="border-b border-[var(--border)] last:border-b-0">
              <Row
                item={item}
                shown={!parentHidden}
                saving={savingId === item.id}
                onToggle={() => toggle(item.id)}
              />

              {item.children.length > 0 && (
                <ul className="border-t border-[var(--border)] bg-white/[0.02]">
                  {item.children.map((child) => (
                    <li key={child.id} className="border-b border-[var(--border)] pl-6 last:border-b-0 sm:pl-10">
                      <Row
                        item={child}
                        shown={!parentHidden && !hiddenIds.has(child.id)}
                        saving={savingId === child.id}
                        disabled={parentHidden}
                        note={parentHidden ? `Hidden with ${item.label}` : undefined}
                        onToggle={() => toggle(child.id)}
                        sub
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Row({
  item,
  shown,
  saving,
  disabled,
  note,
  sub,
  onToggle,
}: {
  item: Item;
  shown: boolean;
  saving: boolean;
  disabled?: boolean;
  note?: string;
  sub?: boolean;
  onToggle: () => void;
}) {
  const label = sub ? `Show ${item.label} in the Shop dropdown` : `Show ${item.label} in the menu`;

  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <p
          className={`font-semibold ${sub ? "text-sm" : "text-base"} ${
            shown ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] line-through"
          }`}
        >
          {item.label}
        </p>
        <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
          {saving ? "Saving…" : note ?? (shown ? "Shown" : "Hidden")} &middot; {item.href}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={shown}
        aria-label={label}
        onClick={onToggle}
        disabled={disabled || saving}
        className={`relative h-11 w-[72px] shrink-0 border transition-colors disabled:opacity-40 ${
          shown ? "border-[var(--accent)] bg-[var(--accent)]/20" : "border-[var(--border)] bg-transparent"
        }`}
      >
        {/* 44px tall hit area: the admin's touch-target floor. */}
        <span
          className={`absolute top-1/2 h-8 w-8 -translate-y-1/2 transition-all ${
            shown ? "left-[34px] bg-[var(--accent)]" : "left-1 bg-[var(--text-muted)]"
          }`}
        />
      </button>
    </div>
  );
}
