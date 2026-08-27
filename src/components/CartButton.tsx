"use client";

import { useCart } from "@/lib/cart-context";

export default function CartButton() {
  const { count, openCart } = useCart();

  return (
    <button
      onClick={openCart}
      aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
      type="button"
      className="flex items-center gap-2 border border-[var(--border)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--text-body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      <span>Cart</span>
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[11px] leading-none text-[var(--on-accent)]">
        {count}
      </span>
    </button>
  );
}
