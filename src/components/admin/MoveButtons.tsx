"use client";

/**
 * Up/down (or left/right) reorder controls, shown only on touch-sized
 * screens.
 *
 * The admin grids reorder with native HTML5 drag-and-drop, which phones do
 * not fire at all — dragging a tile there does nothing, with no indication
 * why. Rather than reimplement dragging with pointer events (fiddly, and it
 * fights the browser's own scroll gesture), each item gets explicit move
 * buttons below `sm`. They are unambiguous, reliable, and land the item
 * exactly where intended on the first try.
 *
 * Buttons are 44px to meet the usual touch-target guideline, and disable at
 * the ends of the list so the control always reflects what is possible.
 */
export default function MoveButtons({
  index,
  total,
  onMove,
  className = "",
}: {
  index: number;
  total: number;
  /** Called with the destination index. */
  onMove: (to: number) => void;
  className?: string;
}) {
  if (total < 2) return null;

  return (
    <div className={`flex gap-2 sm:hidden ${className}`}>
      <button
        type="button"
        aria-label="Move earlier"
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
        className="flex h-11 flex-1 items-center justify-center border border-[var(--border)] text-[var(--text-muted)] transition-colors disabled:opacity-30 [&:not(:disabled)]:hover:border-[var(--accent)] [&:not(:disabled)]:hover:text-[var(--accent)]"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Move later"
        disabled={index === total - 1}
        onClick={() => onMove(index + 1)}
        className="flex h-11 flex-1 items-center justify-center border border-[var(--border)] text-[var(--text-muted)] transition-colors disabled:opacity-30 [&:not(:disabled)]:hover:border-[var(--accent)] [&:not(:disabled)]:hover:text-[var(--accent)]"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M8 3v10M8 13l-4.5-4.5M8 13l4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
