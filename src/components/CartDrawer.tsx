"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/product";

export default function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    setQuantity,
    removeItem,
    subtotalCents,
    shippingCents,
    totalCents,
  } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    if (items.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            size: i.size,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      {/* Scrim */}
      <div
        aria-hidden={!isOpen}
        onClick={closeCart}
        className={`fixed inset-0 z-40 bg-black/70 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Shopping cart"
        aria-modal="true"
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--bg-primary)] shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <span className="section-label">Your Cart</span>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="text-2xl leading-none text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            &times;
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-[var(--text-muted)]">Your cart is empty.</p>
            <button onClick={closeCart} className="btn-outline">
              Keep Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.size}`}
                  className="flex gap-4 border-b border-[var(--border)] py-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-widest text-[var(--text-muted)]">
                      Size: {item.size}
                    </p>

                    {/* Quantity stepper */}
                    <div className="mt-3 inline-flex items-center border border-[var(--border)]">
                      <button
                        aria-label="Decrease quantity"
                        onClick={() =>
                          setQuantity(
                            item.productId,
                            item.size,
                            item.quantity - 1,
                          )
                        }
                        className="h-8 w-8 text-[var(--text-body)] transition-colors hover:bg-[var(--bg-section-alt)]"
                      >
                        &minus;
                      </button>
                      <span className="w-8 text-center text-sm text-[var(--text-primary)]">
                        {item.quantity}
                      </span>
                      <button
                        aria-label="Increase quantity"
                        onClick={() =>
                          setQuantity(
                            item.productId,
                            item.size,
                            item.quantity + 1,
                          )
                        }
                        className="h-8 w-8 text-[var(--text-body)] transition-colors hover:bg-[var(--bg-section-alt)]"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between">
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {formatPrice(item.priceCents * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeItem(item.productId, item.size)}
                      className="text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <footer className="border-t border-[var(--border)] px-6 py-5">
              <div className="mb-1 flex justify-between text-sm text-[var(--text-body)]">
                <span>Subtotal</span>
                <span>{formatPrice(subtotalCents)}</span>
              </div>
              <div className="mb-3 flex justify-between text-sm text-[var(--text-body)]">
                <span>Shipping</span>
                <span>{formatPrice(shippingCents)}</span>
              </div>
              <div className="mb-5 flex justify-between border-t border-[var(--border)] pt-3 text-base font-bold text-[var(--text-primary)]">
                <span>Total</span>
                <span>{formatPrice(totalCents)}</span>
              </div>

              {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

              <button
                onClick={handleCheckout}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? "Redirecting..." : "Checkout"}
              </button>
              <p className="mt-3 text-center text-xs uppercase tracking-widest text-[var(--text-muted)]">
                Limited run &middot; Once it&apos;s gone, it&apos;s gone
              </p>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
