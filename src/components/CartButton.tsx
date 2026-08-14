"use client";

import { useCart } from "@/lib/cart-context";

export default function CartButton() {
  const { count, openCart } = useCart();

  return (
    <button
      onClick={openCart}
      aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
      className="fixed right-4 top-4 z-30 flex items-center gap-2 border border-white/25 bg-black/40 px-4 py-3 text-xs font-bold uppercase tracking-widest text-white backdrop-blur transition-colors hover:border-white/60"
    >
      <span>Cart</span>
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[11px] leading-none text-[var(--on-accent)]">
        {count}
      </span>
    </button>
  );
}
