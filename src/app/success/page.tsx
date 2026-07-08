"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatPrice } from "@/lib/product";

type Order = {
  email?: string;
  amountTotal?: number;
  size?: string;
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }
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
          {order.size && (
            <p className="mb-2 text-sm text-[var(--text-body)]">
              <span className="text-[var(--text-muted)]">Size:</span>{" "}
              {order.size}
            </p>
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
    </main>
  );
}
