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
      <section className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 pt-20 pb-16 text-center sm:pt-28">
        <span className="section-label">Greg Romano Art — Limited Drop</span>
        <Image
          src="/idfg-logo.webp"
          alt="ID4G — I'll Die For The Gospel"
          width={653}
          height={633}
          priority
          className="w-full max-w-sm sm:max-w-md"
        />
        <p className="lead max-w-xl">
          Wearable art for those who count the cost and follow anyway. A bold
          declaration of faith, worn by the ones who mean it.
        </p>
      </section>

      {/* Product image */}
      <section className="mx-auto max-w-3xl px-6">
        <div className="aspect-square w-full overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--bg-section-alt)]">
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

        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setView("front")}
            className={`rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
              view === "front"
                ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                : "border-[var(--border)] text-[var(--text-body)] hover:border-[var(--gold)]"
            }`}
          >
            Front
          </button>
          <button
            onClick={() => setView("back")}
            className={`rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
              view === "back"
                ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                : "border-[var(--border)] text-[var(--text-body)] hover:border-[var(--gold)]"
            }`}
          >
            Back
          </button>
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-2xl px-6 py-20 text-center">
        <span className="section-label mb-3">The Statement</span>
        <p className="text-lg text-[var(--text-body)]">
          &ldquo;The LORD is close to the brokenhearted and saves those who
          are crushed in spirit.&rdquo; Psalm 34:18. We&apos;re broken. Christ
          died for us anyway. This is a declaration stitched into cotton for
          the ones who&apos;ll die for that gospel too.
        </p>
      </section>

      {/* Purchase */}
      <section className="mx-auto max-w-md px-6 pb-28">
        <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-section-alt)] p-8">
          <h2 className="h2 mb-2 text-center">Get Yours</h2>
          <p className="mb-1 text-center text-2xl font-bold text-[var(--text-primary)]">
            {formatPrice(PRODUCT.priceCents)}
          </p>
          <p className="mb-6 text-center text-sm text-[var(--text-muted)]">
            +{" "}
            {formatPrice(PRODUCT.shippingCents)} shipping{" "}
            &middot; Limited run. Once it&apos;s gone, it&apos;s gone.
          </p>

          <p className="section-label mb-3 text-center">Select Size</p>
          <div className="mb-2 flex justify-center gap-2">
            {PRODUCT.sizes.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSize(s);
                  setError(null);
                }}
                className={`h-11 w-11 rounded-full border text-sm font-semibold transition-colors ${
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
            <p className="mb-2 text-center text-sm text-red-400">{error}</p>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="mt-6 w-full rounded-sm bg-[var(--accent)] py-4 text-base font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? "Redirecting..." : "Buy Now"}
          </button>
        </div>
      </section>
    </main>
  );
}
