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
      {/* Top nav — logo mark */}
      <header className="absolute left-0 top-0 z-20 px-6 py-6">
        <Image
          src="/idfg-logo.webp"
          alt="ID4G — I'll Die For The Gospel"
          width={653}
          height={633}
          className="w-full max-w-[72px]"
        />
      </header>

      {/* Full-bleed hero */}
      <section className="relative overflow-hidden bg-black">
        {/* Paint splatter texture — dripping from top-right, pooling bottom-left */}
        <Image
          src="/paint-drip.png"
          alt=""
          width={291}
          height={168}
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 z-[1] w-[240px] opacity-90 mix-blend-screen sm:w-[340px] lg:w-[420px]"
        />
        <Image
          src="/paint-drip.png"
          alt=""
          width={291}
          height={168}
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 z-[1] hidden w-[220px] rotate-180 opacity-60 mix-blend-screen sm:block sm:w-[300px]"
        />

        {/* Mobile: shirt photo up top, full width */}
        <div className="relative h-[46vh] w-full sm:hidden">
          <Image
            src={view === "front" ? "/shirt-front.png" : "/shirt-back.png"}
            alt=""
            fill
            priority
            className="object-cover object-top"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-2/3"
            style={{
              background: "linear-gradient(to top, #000 15%, transparent)",
            }}
          />
        </div>

        {/* Desktop: oversized background photo, right-anchored */}
        <div className="absolute inset-0 hidden sm:block">
          <Image
            src={view === "front" ? "/shirt-front.png" : "/shirt-back.png"}
            alt=""
            fill
            priority
            className="object-contain object-right"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.97) 28%, rgba(0,0,0,0.82) 48%, rgba(0,0,0,0.4) 68%, rgba(0,0,0,0.15) 100%)",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-8 sm:min-h-[92vh] sm:flex sm:items-center sm:py-24">
          <div className="max-w-xl">
            <span className="section-label mb-4">Greg Romano Presents</span>
            <h1 className="mb-6 text-6xl sm:text-7xl lg:text-8xl">
              Brok3n.
              <br />
              Not Forsaken.
            </h1>
            <p className="lead mb-10 max-w-md">
              &ldquo;The LORD is close to the brokenhearted and saves those
              who are crushed in spirit.&rdquo; Psalm 34:18. A limited-run tee
              for the ones who&apos;ll die for that gospel.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <a href="#get-yours" className="btn-primary">
                Get Yours &mdash; {formatPrice(PRODUCT.priceCents)}
              </a>
              <button
                onClick={() => setView(view === "front" ? "back" : "front")}
                className="btn-outline"
              >
                View {view === "front" ? "Back" : "Front"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Cream urgency panel */}
      <section style={{ background: "var(--bg-cream)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm font-bold uppercase tracking-widest text-black">
            Limited run &middot; Never restocked
          </p>
          <p className="text-sm font-semibold text-black/70">
            Once it&apos;s gone, it&apos;s gone for good.
          </p>
        </div>
      </section>

      {/* Product detail + purchase */}
      <section id="get-yours" className="border-b border-[var(--border)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:py-24 lg:grid-cols-2 lg:items-start lg:gap-16">
          {/* Product image */}
          <div>
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

            {/* Details matter, GRA-style feature list */}
            <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {[
                ["Heavyweight Cotton", "Structured, boxy drape"],
                ["Screen Printed", "Cracked gothic lettering"],
                ["Front & Back", "Full statement both sides"],
                ["Numbered Drop", "Never restocked"],
              ].map(([title, desc]) => (
                <div key={title}>
                  <span className="mb-1 block h-[3px] w-6 bg-[var(--accent)]" />
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]">
                    {title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Purchase */}
          <div>
            <span className="section-label mb-3">The Drop</span>
            <h2 className="mb-6 text-4xl sm:text-5xl">Get Yours</h2>

            <div className="mb-8 flex items-baseline gap-3">
              <span className="text-4xl font-bold text-[var(--text-primary)]">
                {formatPrice(PRODUCT.priceCents)}
              </span>
              <span className="text-sm text-[var(--text-muted)]">
                + {formatPrice(PRODUCT.shippingCents)} shipping
              </span>
            </div>

            <p className="section-label mb-3">Select Size</p>
            <div className="mb-8 flex gap-2">
              {PRODUCT.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSize(s);
                    setError(null);
                  }}
                  className={`h-12 w-12 border text-sm font-semibold transition-colors ${
                    size === s
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--border)] text-[var(--text-body)] hover:border-[var(--gold)]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="btn-primary w-full sm:w-auto"
            >
              {loading ? "Redirecting..." : "Buy Now"}
            </button>
            <p className="mt-4 text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Limited run &middot; Once it&apos;s gone, it&apos;s gone
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
