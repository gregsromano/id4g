"use client";

import Image from "next/image";
import { useState } from "react";
import { PRODUCT, formatPrice, type Size } from "@/lib/product";
import { useCart } from "@/lib/cart-context";

export default function Home() {
  const { addItem } = useCart();
  const [size, setSize] = useState<Size | null>(null);
  const [view, setView] = useState<"front" | "back">("front");
  const [error, setError] = useState<string | null>(null);

  function handleAddToCart() {
    if (!size) {
      setError("Please select a size.");
      return;
    }
    setError(null);
    addItem({
      productId: PRODUCT.id,
      name: PRODUCT.name,
      size,
      priceCents: PRODUCT.priceCents,
    });
  }

  return (
    <main className="flex-1 bg-[var(--bg-primary)]">
      {/* Top nav — logo mark */}
      <header className="absolute inset-x-0 top-0 z-20 py-6">
        <div className="mx-auto w-full max-w-6xl px-6">
          <Image
            src="/idfg-logo.webp"
            alt="ID4G — I'll Die For The Gospel"
            width={653}
            height={633}
            className="w-full max-w-[72px]"
          />
        </div>
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
          className="pointer-events-none absolute right-0 top-0 z-0 w-[240px] opacity-90 mix-blend-screen sm:w-[340px] lg:w-[420px]"
        />
        <Image
          src="/paint-drip.png"
          alt=""
          width={291}
          height={168}
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 z-0 hidden w-[220px] rotate-180 opacity-60 mix-blend-screen sm:block sm:w-[300px]"
        />

        {/* Desktop: oversized background photo, pulled in from the right edge */}
        <div className="absolute inset-y-0 right-[2%] z-[1] hidden w-[60%] sm:block lg:right-[4%] lg:w-[56%]">
          <Image
            src="/shirt-front-back.png"
            alt=""
            fill
            priority
            className="object-contain object-center"
          />
        </div>

        {/* Desktop: gradient scrim so the copy stays legible over the photo */}
        <div
          className="pointer-events-none absolute inset-0 z-[2] hidden sm:block"
          style={{
            background:
              "linear-gradient(100deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 24%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 70%)",
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-32 sm:min-h-[92vh] sm:flex sm:items-center sm:py-24">
          <div className="max-w-xl">
            <span className="section-label mb-4">Greg Romano Presents</span>
            <h1 className="mb-6 text-6xl sm:text-7xl lg:text-8xl">
              Brok3n
              <br />
              <span className="block text-4xl text-[var(--accent)] sm:text-5xl lg:text-6xl">
                Psalm 34:18
              </span>
            </h1>
            <p className="lead mb-10 max-w-md">
              &ldquo;The LORD is close to the brokenhearted and saves those
              who are crushed in spirit.&rdquo; Psalm 34:18
            </p>

            {/* Mobile: shirts above the CTA; desktop keeps CTA in place */}
            <div className="flex flex-col">
              {/* Mobile: shirt photo below the copy */}
              <div className="relative order-1 mb-10 h-[42vh] w-full sm:hidden">
                <Image
                  src="/shirt-front-back.png"
                  alt=""
                  fill
                  priority
                  className="object-contain object-center"
                />
              </div>

              <div className="order-2 flex flex-wrap items-center gap-4">
                <a href="#get-yours" className="btn-primary">
                  Get Yours &mdash; {formatPrice(PRODUCT.priceCents)}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cream urgency panel */}
      <section style={{ background: "var(--bg-cream)" }}>
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-center text-sm font-bold uppercase tracking-widest text-black">
            Hand Made &middot; Unique Distinct Design &middot; No Two Alike
            &middot; Every piece one of a kind.
          </p>
        </div>
      </section>

      {/* Product detail + purchase */}
      <section id="get-yours" className="border-b border-[var(--border)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:py-24 lg:grid-cols-2 lg:items-start lg:gap-16">
          {/* Product image */}
          <div>
            <div className="aspect-square w-full overflow-hidden">
              <Image
                src={view === "front" ? "/shirt-front.png" : "/shirt-back.png"}
                alt={
                  view === "front"
                    ? "BROK3N t-shirt front — Psalm 34:18"
                    : "BROK3N t-shirt back — The LORD is close to the brokenhearted"
                }
                width={2559}
                height={2739}
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
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]"
                      : "border-[var(--border)] text-[var(--text-body)] hover:border-[var(--gold)]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

            <button
              onClick={handleAddToCart}
              className="btn-primary w-full sm:w-auto"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </section>

      {/* Lookbook — lifestyle gallery */}
      <section id="lookbook" className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="!text-4xl sm:!text-5xl">Lifestyle</h2>
            </div>
          </div>

          {/* Mosaic: tall hero left, stacked pair right, two wide below */}
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-12">
            {/* Hero portrait */}
            <figure className="group relative overflow-hidden lg:col-span-7 lg:row-span-2">
              <Image
                src="/lifestyle-alleyway.png"
                alt="BROK3N tee worn in a city alleyway at night"
                width={800}
                height={1000}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </figure>

            {/* Stacked pair */}
            <figure className="group relative overflow-hidden lg:col-span-5">
              <Image
                src="/lifestyle-studio-seated.png"
                alt="BROK3N tee in a studio portrait"
                width={800}
                height={1000}
                className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
              />
            </figure>

            <figure className="group relative overflow-hidden lg:col-span-5">
              <Image
                src="/lifestyle-escalade.png"
                alt="BROK3N tee worn against a city skyline"
                width={800}
                height={600}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </figure>

            {/* Wide pair */}
            <figure className="group relative overflow-hidden lg:col-span-7">
              <Image
                src="/lifestyle-street-race.png"
                alt="BROK3N tee worn on the street at night"
                width={800}
                height={640}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </figure>

            <figure className="group relative overflow-hidden lg:col-span-5">
              <Image
                src="/lifestyle-studio-full.png"
                alt="BROK3N tee, full-length studio shot"
                width={800}
                height={1000}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </figure>
          </div>
        </div>
      </section>

      {/* The story behind the shirt */}
      <section id="the-story" style={{ background: "var(--bg-section-alt)" }}>
        {/* Opening: headline + the origin line as a pull quote */}
        <div className="mx-auto grid max-w-6xl gap-10 px-6 pt-16 sm:pt-24 lg:grid-cols-[1fr_1.25fr] lg:items-start lg:gap-16">
          <div>
            <span className="section-label mb-4 !text-base sm:!text-lg">
              The Story
            </span>
            <h2 className="!text-5xl sm:!text-6xl lg:!text-7xl">
              Behind
              <br />
              The Shirt
            </h2>
            <span className="mt-8 block h-[4px] w-24 bg-[var(--accent)]" />
          </div>

          <div>
            <p className="border-l-2 border-[var(--accent)] pl-6 text-3xl leading-snug text-[var(--text-primary)] sm:text-4xl">
              I&rsquo;ll Die for the Gospel was born from my love for God,
              clothing, and art.
            </p>
            <p className="mt-6 pl-6 text-lg text-[var(--text-body)] sm:text-xl">
              I wanted to create something that represents my faith without
              losing the creativity and individuality of streetwear.
            </p>
          </div>
        </div>

        {/* Where the craft comes from */}
        <div className="mx-auto max-w-6xl px-6 pt-16 sm:pt-20">
          <div className="border-t border-[var(--border)] pt-12 sm:pt-16">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.25fr] lg:gap-16">
              <h3 className="font-[family-name:var(--font-block)] text-3xl uppercase leading-none tracking-wide text-[var(--text-primary)] sm:text-4xl">
                Where The
                <br />
                Craft Comes From
              </h3>
              <div className="space-y-5 text-lg text-[var(--text-body)] sm:text-xl">
                <p>
                  Art has been part of my life for as long as I can remember.
                  From graffiti and graphic design to producing and directing
                  movies and music videos, creativity has always been how I
                  express myself.
                </p>
                <p>
                  I also spent over 12 years working in television on Emmy
                  Award-winning shows, creating graphics seen on air every day.
                </p>
                <p className="text-2xl text-[var(--text-primary)] sm:text-3xl">
                  Now I&rsquo;m bringing all of those experiences together with
                  my faith.
                </p>
              </div>
            </div>

            {/* Credentials strip */}
            <div className="mt-12 grid grid-cols-2 gap-8 border-t border-[var(--border)] pt-10 sm:grid-cols-4">
              {[
                ["12+", "Years in Hollywood"],
                ["Emmy", "Award-winning shows"],
                ["Film", "Produced and directed"],
                ["Graffiti", "Where it started"],
              ].map(([stat, label]) => (
                <div key={label}>
                  <p className="font-[family-name:var(--font-block)] text-3xl uppercase leading-none text-[var(--accent)] sm:text-4xl">
                    {stat}
                  </p>
                  <p className="mt-2 text-base uppercase tracking-wide text-[var(--text-muted)]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wearable art */}
        <div className="mx-auto max-w-6xl px-6 pt-16 sm:pt-20">
          <div className="border-t border-[var(--border)] pt-12 sm:pt-16">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.25fr] lg:gap-16">
              <h3 className="font-[family-name:var(--font-block)] text-3xl uppercase leading-none tracking-wide text-[var(--text-primary)] sm:text-4xl">
                Wearable
                <br />
                Art
              </h3>
              <div className="space-y-5 text-lg text-[var(--text-body)] sm:text-xl">
                <p>
                  Every I&rsquo;ll Die for the Gospel piece is created as
                  wearable art. Through hand-done details, rhinestones,
                  bleaching, and different techniques, each piece becomes
                  uniquely its own.
                </p>
                <p className="text-2xl text-[var(--text-primary)] sm:text-3xl">
                  No two will ever be exactly the same.
                </p>
                <p>
                  Every piece is meant to feel personal, original, and
                  collectible.
                </p>
                <p>
                  I didn&rsquo;t want to create another clothing brand that
                  simply puts a Bible verse on a shirt. I wanted to take my
                  background in art, graffiti, design, film, music, and
                  television and use it to create something that represents God
                  in a way that feels authentic to me.
                </p>
                <p className="pt-2 text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">
                  Greg Romano
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Closer */}
        <div className="mt-16 sm:mt-24" style={{ background: "var(--accent)" }}>
          <p className="mx-auto max-w-6xl px-6 py-10 text-center font-[family-name:var(--font-block)] text-4xl uppercase leading-none tracking-wide text-[var(--on-accent)] sm:py-14 sm:text-6xl lg:text-7xl">
            Faith. Art. One of One.
          </p>
        </div>
      </section>

    </main>
  );
}
