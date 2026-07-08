"use client";

import Image from "next/image";
import { useState } from "react";
import { PRODUCT, formatPrice } from "@/lib/product";

export default function Home() {
  const [size, setSize] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"front" | "back">("front");
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    if (!size) {
      setError("Please select a size.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Something went wrong. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 bg-[var(--bg-primary)]">
      {/* Hero */}
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Product image */}
          <div className="order-1 lg:order-2">
            <div className="aspect-square w-full overflow-hidden bg-[var(--bg-section-alt)]">
              <Image
                src={view === "front" ? "/shirt-front.png" : "/shirt-back.png"}
                alt={
                  view === "front"
                    ? "BROK3N t-shirt front — Psalm 34:18"
                    : "BROK3N t-shirt back — The LORD is close to the brokenhearted"
                }
                width={1054}
                height={1054}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div className="mt-3 flex gap-6 border-t border-[var(--border)] pt-3">
              <button
                onClick={() => setView("front")}
                className={`text-xs font-bold uppercase tracking-widest transition-colors ${
                  view === "front"
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-body)]"
                }`}
              >
                Front
              </button>
              <button
                onClick={() => setView("back")}
                className={`text-xs font-bold uppercase tracking-widest transition-colors ${
                  view === "back"
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-body)]"
                }`}
              >
                Back
              </button>
            </div>
          </div>

          {/* Copy + purchase */}
          <div className="order-2 lg:order-1">
            <span className="section-label mb-4">
              Presented by Greg Romano Art
            </span>
            <h1 className="mb-5 text-5xl sm:text-6xl">
              Brok3n.
              <br />
              Not Forsaken.
            </h1>
            <p className="lead mb-8 max-w-md">
              &ldquo;The LORD is close to the brokenhearted and saves those
              who are crushed in spirit.&rdquo; Psalm 34:18. A limited-run tee
              for the ones who&apos;ll die for that gospel.
            </p>

            <div className="mb-6 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-[var(--text-primary)]">
                {formatPrice(PRODUCT.priceCents)}
              </span>
              <span className="text-sm text-[var(--text-muted)]">
                + {formatPrice(PRODUCT.shippingCents)} shipping
              </span>
            </div>

            <p className="section-label mb-3">Select Size</p>
            <div className="mb-6 flex gap-2">
              {PRODUCT.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSize(s);
                    setError(null);
                  }}
                  className={`h-11 w-11 border text-sm font-semibold transition-colors ${
                    size === s
                      ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                      : "border-[var(--border)] text-[var(--text-body)] hover:border-[var(--gold)]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-400">{error}</p>
            )}

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-[var(--accent)] py-4 text-base font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50 sm:w-auto sm:px-16"
            >
              {loading ? "Redirecting..." : "Buy Now"}
            </button>
            <p className="mt-3 text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Limited run &middot; Once it&apos;s gone, it&apos;s gone
            </p>
          </div>
        </div>
      </section>

      {/* Brand mark */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <Image
          src="/idfg-logo.webp"
          alt="ID4G — I'll Die For The Gospel"
          width={653}
          height={633}
          className="mx-auto w-full max-w-[220px]"
        />
      </section>
    </main>
  );
}
