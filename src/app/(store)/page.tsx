import Image from "next/image";

import { listActiveProducts } from "@/lib/products";
import { listLifestyleImages } from "@/lib/lifestyle";
import { formatPrice } from "@/lib/product";
import LifestyleGallery from "@/components/LifestyleGallery";
import ProductQuickView from "@/components/ProductQuickView";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Both reads are independent, so run them concurrently rather than
  // serializing two round trips on every render of a force-dynamic page.
  const [products, lifestyleImages] = await Promise.all([
    listActiveProducts(),
    listLifestyleImages(),
  ]);

  return (
    <main className="flex-1 bg-[var(--bg-primary)]">
      {/* Full-bleed hero */}
      <section className="relative overflow-hidden bg-black">
        {/* Paint splatter texture — dripping from top-right, pooling bottom-left */}
        <Image
          src="/paint-drip.png"
          alt=""
          width={291}
          height={168}
          aria-hidden
          unoptimized
          className="pointer-events-none absolute right-0 top-0 z-0 w-[240px] opacity-90 mix-blend-screen sm:w-[340px] lg:w-[420px]"
        />
        <Image
          src="/paint-drip.png"
          alt=""
          width={291}
          height={168}
          aria-hidden
          unoptimized
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

        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-8 pt-6 sm:min-h-[80vh] sm:flex sm:items-center sm:py-24">
          <div className="max-w-xl">
            <span className="section-label mb-4">Greg Romano Presents</span>
            <h1 className="mb-6 text-6xl sm:text-7xl lg:text-8xl">
              Brok3n
              <br />
              <span className="block text-4xl text-[var(--accent)] sm:text-5xl lg:text-6xl">
                Psalm 34:18
              </span>
            </h1>
            <p className="lead mb-6 max-w-md">
              &ldquo;The LORD is close to the brokenhearted and saves those
              who are crushed in spirit.&rdquo; Psalm 34:18
            </p>

            {/* Mobile: shirts above the CTA; desktop keeps CTA in place */}
            <div className="flex flex-col">
              {/* Mobile: shirt photo below the copy */}
              <div className="relative order-1 -mx-6 mb-6 h-[56vh] w-[calc(100%+3rem)] sm:hidden">
                <Image
                  src="/shirt-front-back.png"
                  alt=""
                  fill
                  priority
                  className="object-contain object-center"
                />
              </div>

              <div className="order-2 -mt-4 flex flex-wrap items-center gap-4 sm:mt-0">
                <a href="#shop" className="btn-primary">
                  Shop the Drop
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
            &middot; Every piece one of a kind
          </p>
        </div>
      </section>

      {/* Shop — product grid */}
      <section id="shop" className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <span className="section-label mb-3">The Drop</span>
          <h2 className="mb-10 text-4xl sm:text-5xl">Shop</h2>

          {products.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Nothing in stock right now.</p>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-x-16 lg:grid-cols-3">
              {products.map((product) => (
                <ProductQuickView
                  key={product.id}
                  href={`/products/${product.slug}`}
                  name={product.name}
                  priceLabel={formatPrice(product.priceCents)}
                  image={product.images[0]}
                />
              ))}
            </div>
          )}
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

          <LifestyleGallery images={lifestyleImages} />
        </div>
      </section>

    </main>
  );
}
