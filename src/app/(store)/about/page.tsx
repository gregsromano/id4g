import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Greg — I'll Die For The Gospel",
  description:
    "The story behind I'll Die for the Gospel — Greg Romano's faith, art, and streetwear brand.",
};

export default function AboutPage() {
  return (
    <main className="flex-1 bg-[var(--bg-primary)]">
      {/* The story behind the shirt */}
      <section style={{ background: "var(--bg-section-alt)" }}>
        {/* Opening: headline + the origin line as a pull quote */}
        <div className="relative overflow-hidden">
          {/* Paint splatter texture — matches the homepage hero */}
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

          <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-6 pt-16 sm:pt-24 lg:grid-cols-[1fr_1.25fr] lg:items-start lg:gap-16">
            <div>
              <span className="section-label mb-4 !text-base sm:!text-lg">
                The Story
              </span>
              <h1 className="!text-5xl sm:!text-6xl lg:!text-7xl">
                Behind
                <br />
                The Shirt
              </h1>
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
        </div>

        {/* Where the craft comes from */}
        <div className="mx-auto max-w-6xl px-6 pt-16 sm:pt-20">
          <div className="border-t border-[var(--border)] pt-12 sm:pt-16">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.25fr] lg:gap-16">
              <h2 className="font-[family-name:var(--font-block)] text-3xl uppercase leading-none tracking-wide text-[var(--text-primary)] sm:text-4xl">
                Where The
                <br />
                Craft Comes From
              </h2>
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
              <h2 className="font-[family-name:var(--font-block)] text-3xl uppercase leading-none tracking-wide text-[var(--text-primary)] sm:text-4xl">
                Wearable
                <br />
                Art
              </h2>
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
