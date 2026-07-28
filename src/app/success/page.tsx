"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatPrice } from "@/lib/product";
import { useCart } from "@/lib/cart-context";

const INSTAGRAM_URL = "https://instagram.com/id4gospel";
const TIKTOK_URL = "https://tiktok.com/@id4gospel";

type OrderItem = { size: string; quantity: number };

type Order = {
  email?: string;
  amountTotal?: number;
  items?: OrderItem[] | null;
  itemsSummary?: string | null;
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { clear } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  // Missing session id is an error from the first render — no effect needed.
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    sessionId ? "loading" : "error",
  );

  // The order is placed — empty the local cart so a refresh/back doesn't
  // leave stale items behind.
  useEffect(() => {
    clear();
    // Run once on mount; `clear` identity is stable enough for this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/order?session_id=${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => {
        setOrder(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [sessionId]);

  if (status === "loading") {
    return <p className="text-[var(--text-muted)]">Confirming your order...</p>;
  }

  if (status === "error") {
    return (
      <>
        <span className="section-label">Order Status Unknown</span>
        <h1 className="max-w-lg">Having Trouble?</h1>
        <p className="lead max-w-md">
          We couldn&apos;t confirm this order automatically. If you completed
          checkout, your payment likely went through. Check your email for a
          receipt, or reach out and we&apos;ll sort it out.
        </p>
      </>
    );
  }

  return (
    <>
      <span className="section-label">Order Confirmed</span>
      <h1 className="max-w-lg">You&apos;re In.</h1>
      <p className="lead max-w-md">
        Thanks for your order. A confirmation email is on its way. Wear it
        boldly.
      </p>
      {order && (
        <div className="mt-4 rounded-sm border border-[var(--border)] bg-[var(--bg-section-alt)] px-8 py-6 text-left">
          {order.items && order.items.length > 0 ? (
            <div className="mb-2">
              <span className="text-sm text-[var(--text-muted)]">Items:</span>
              <ul className="mt-1 space-y-1">
                {order.items.map((it) => (
                  <li
                    key={it.size}
                    className="text-sm text-[var(--text-body)]"
                  >
                    Size {it.size} &times; {it.quantity}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            order.itemsSummary && (
              <p className="mb-2 text-sm text-[var(--text-body)]">
                <span className="text-[var(--text-muted)]">Items:</span>{" "}
                {order.itemsSummary}
              </p>
            )
          )}
          {order.amountTotal != null && (
            <p className="mb-2 text-sm text-[var(--text-body)]">
              <span className="text-[var(--text-muted)]">Total:</span>{" "}
              {formatPrice(order.amountTotal)}
            </p>
          )}
          {order.email && (
            <p className="text-sm text-[var(--text-body)]">
              <span className="text-[var(--text-muted)]">
                Confirmation sent to:
              </span>{" "}
              {order.email}
            </p>
          )}
        </div>
      )}
    </>
  );
}

export default function Success() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-[var(--bg-primary)] px-6 py-32 text-center">
      <Suspense
        fallback={
          <p className="text-[var(--text-muted)]">Loading...</p>
        }
      >
        <SuccessContent />
      </Suspense>

      {/* Onward navigation — the confirmation page is otherwise a dead end. */}
      <div className="mt-8 flex flex-col items-center gap-12">
        <Link href="/" className="btn-primary">
          Back to Store
        </Link>
        <div className="flex flex-col items-center gap-8">
          <p className="text-lg font-bold uppercase tracking-widest text-[var(--text-primary)] sm:text-2xl">
            Tag us when it lands &mdash;{" "}
            <span className="text-[var(--accent)]">@id4gospel</span>
          </p>
          <div className="flex items-center gap-6">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow @id4gospel on Instagram"
              className="text-[var(--text-body)] transition-colors hover:text-[var(--accent)]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                className="h-14 w-14"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow @id4gospel on TikTok"
              className="text-[var(--text-body)] transition-colors hover:text-[var(--accent)]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                className="h-14 w-14"
              >
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.04-.1z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
