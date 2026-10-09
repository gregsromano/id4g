import type { Metadata } from "next";
import Link from "next/link";

import { SITE_MAP_SECTIONS } from "@/lib/nav-links";
import { listActiveProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/sitemap" },
  title: "Site Map — I'm Down For The Gospel",
  description: "Every page on I'm Down For The Gospel, in one place.",
};

/**
 * Human-readable sitemap page, at /sitemap.
 *
 * Distinct from sitemap.xml (src/app/sitemap.ts), which crawlers read but no
 * visitor ever sees. This is the page the footer's "Site Map" section links
 * to, and it also lists every active product — sitemap.xml generates that
 * list from the live catalog, so this does too rather than keeping a second,
 * separately-maintained product list.
 */
export default async function SiteMapPage() {
  let products: { slug: string; name: string }[] = [];
  try {
    products = await listActiveProducts();
  } catch (error) {
    console.error("[sitemap page] failed to list products", error);
  }

  return (
    <main className="flex-1 bg-[var(--bg-primary)]">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <span className="section-label mb-3">Explore</span>
        <h1 className="!text-4xl text-[var(--text-primary)] sm:!text-5xl">
          Site Map
        </h1>

        <div className="mt-10 space-y-10">
          {SITE_MAP_SECTIONS.map((section) => (
            <Section key={section.heading} title={section.heading}>
              {section.links.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[var(--accent)]"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="hover:text-[var(--accent)]">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </Section>
          ))}

          {products.length > 0 && (
            <Section title="Products">
              {products.map((product) => (
                <li key={product.slug}>
                  <Link href={`/products/${product.slug}`} className="hover:text-[var(--accent)]">
                    {product.name}
                  </Link>
                </li>
              ))}
            </Section>
          )}
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="!text-xl !normal-case text-[var(--text-primary)]">{title}</h2>
      <ul className="mt-3 space-y-2 text-[var(--text-body)]">{children}</ul>
    </div>
  );
}
