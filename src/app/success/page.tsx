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
      <div className="mt-8 flex flex-col items-center gap-6">
        <Link href="/" className="btn-primary">
          Back to Store
        </Link>
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
            Tag us when it lands &mdash; @id4gospel
          </p>
          <div className="flex items-center gap-6">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold uppercase tracking-widest text-[var(--text-body)] transition-colors hover:text-[var(--accent)]"
            >
              Instagram
            </a>
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold uppercase tracking-widest text-[var(--text-body)] transition-colors hover:text-[var(--accent)]"
            >
              TikTok
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
