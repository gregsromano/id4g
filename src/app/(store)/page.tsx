import Image from "next/image";
import Link from "next/link";

import { listActiveProducts } from "@/lib/products";
import { formatPrice } from "@/lib/product";

export const dynamic = "force-dynamic";

const ICON_PROPS = {
  width: 28,
  height: 28,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const PROCESS_STEPS = [
  {
    title: "Design",
    description:
      "Every drop starts as original art — faith, graffiti, and streetwear worked into one design.",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    title: "Limited Print Run",
    description: "Each design prints in a small, numbered run. Once it's gone, it's gone.",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M20.59 13.41 12 22l-9-9V2h11l6.59 6.59a2 2 0 0 1 0 2.82Z" />
        <circle cx="7.5" cy="7.5" r="1.5" />
      </svg>
    ),
  },
  {
    title: "Hand-Finished",
    description:
      "Bleaching, rhinestones, and hand-applied details make every piece one of a kind.",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="m12 2 2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2Z" />
      </svg>
    ),
  },
  {
    title: "Shipped To You",
    description: "Packed with care and shipped straight to your door.",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.27 6.96 8.73 5.05 8.73-5.05" />
        <path d="M12 22.08V12" />
      </svg>
    ),
  },
];

export default async function Home() {
  const products = await listActiveProducts();

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

        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-16 sm:min-h-[80vh] sm:flex sm:items-center sm:py-24">
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
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => {
                const image = product.images[0];
                return (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-square w-full overflow-hidden">
                      {image ? (
                        <>
                          <Image
                            src={image.url}
                            alt={image.alt}
                            width={800}
                            height={800}
                            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                          />
                          {image.alt && (
                            <span className="absolute bottom-2 left-2 border border-[var(--border)] bg-[var(--bg-primary)]/80 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                              {image.alt}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-[var(--text-muted)]">
                          No image
                        </div>
                      )}
                    </div>
                    <h3 className="mt-4 text-base font-bold uppercase tracking-wide text-[var(--text-primary)]">
                      {product.name}
                    </h3>
                    {product.category && (
                      <p className="mt-1 text-xs uppercase tracking-widest text-[var(--text-muted)]">
                        {product.category}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-[var(--text-body)]">
                      {formatPrice(product.priceCents)}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* From Idea to Wearable Art — process steps */}
      <section id="process" className="border-b border-[var(--border)]" style={{ background: "var(--bg-cream)" }}>
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <span className="section-label mb-3 text-black/60">The Process</span>
          <h2 className="mb-12 text-4xl text-black sm:text-5xl">
            From Idea to <span className="text-[var(--accent)]">Wearable Art</span>
          </h2>

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS_STEPS.map((step, i) => (
              <div key={step.title} className="relative">
                <div className="flex h-14 w-14 items-center justify-center border-2 border-black text-black">
                  {step.icon}
                </div>
                <span className="mt-4 block text-xs font-bold uppercase tracking-widest text-black/50">
                  Step {i + 1}
                </span>
                <h3 className="mt-1 text-lg font-bold uppercase tracking-wide text-black">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-black/70">{step.description}</p>
              </div>
            ))}
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
