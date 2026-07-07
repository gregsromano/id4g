"use client";

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
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 py-24 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-400">
          Greg Romano Art — Limited Drop
        </p>
        <h1 className="text-5xl font-bold leading-tight sm:text-6xl">
          I Die For The Gospel
        </h1>
        <p className="max-w-xl text-lg text-zinc-300">
          Wearable art for those who count the cost and follow anyway. A bold
          declaration of faith, made for the ones who mean it.
        </p>

        <div className="mt-8 aspect-square w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-600">
          Shirt mockup goes here
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`h-10 w-10 rounded-full border text-sm font-medium transition-colors ${
                  size === s
                    ? "border-white bg-white text-black"
                    : "border-zinc-700 text-zinc-300 hover:border-zinc-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="mt-2 rounded-full bg-white px-10 py-3 text-base font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Redirecting..." : "Buy Now"}
          </button>
        </div>
      </section>
    </main>
  );
}
