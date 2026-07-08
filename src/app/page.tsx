"use client";

import Image from "next/image";
import { useState } from "react";

const SIZES = ["S", "M", "L", "XL", "2XL"];

export default function Home() {
  const [size, setSize] = useState("M");
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size, quantity: 1 }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
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
        <div className="aspect-square w-full overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--bg-section-alt)] flex items-center justify-center">
          <span className="text-sm uppercase tracking-widest text-[var(--text-muted)]">
            Shirt mockup coming soon
          </span>
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-2xl px-6 py-20 text-center">
        <span className="section-label mb-3">The Statement</span>
        <p className="text-lg text-[var(--text-body)]">
          &ldquo;For to me, to live is Christ, and to die is gain.&rdquo;
          Philippians 1:21. This isn&apos;t merch. It&apos;s a declaration
          stitched into cotton, made for people who wear their convictions
          out loud.
        </p>
      </section>

      {/* Purchase */}
      <section className="mx-auto max-w-md px-6 pb-28">
        <div className="rounded-sm border border-[var(--border)] bg-[var(--bg-section-alt)] p-8">
          <h2 className="h2 mb-2 text-center">Get Yours</h2>
          <p className="mb-6 text-center text-sm text-[var(--text-muted)]">
            Limited run. Once it&apos;s gone, it&apos;s gone.
          </p>

          <p className="section-label mb-3 text-center">Select Size</p>
          <div className="mb-8 flex justify-center gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
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

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full rounded-sm bg-[var(--accent)] py-4 text-base font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? "Redirecting..." : "Buy Now"}
          </button>
        </div>
      </section>
    </main>
  );
}
