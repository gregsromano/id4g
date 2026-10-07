import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProductBySlug } from "@/lib/products";
import { absoluteUrl, jsonLdScript, SITE_NAME, toMetaDescription } from "@/lib/seo";
import DescriptionText from "@/components/DescriptionText";
import ProductGallery from "@/components/ProductGallery";
import ProductPurchasePanel from "@/components/ProductPurchasePanel";

export const dynamic = "force-dynamic";

/**
 * Per-product title and description.
 *
 * Without this every product page inherited the root layout's site-wide
 * metadata, so all seven served an identical <title> and description that
 * never named the product — search engines saw one page repeated, and nothing
 * on the page said what was for sale.
 *
 * `meta_title`/`meta_description` are admin overrides when set; otherwise the
 * name and the (HTML-stripped) description are used. Those columns have
 * existed since 20260827000001 and this is the first code to read them.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  // notFound() belongs in the page, not here — returning plain metadata keeps
  // this from throwing before the page can render its own 404.
  if (!product) return { title: "Product not found" };

  // Products whose own name already carries the brand ("BROK3N Tee — I'm
  // Down For The Gospel") must not get it appended again, or the title reads
  // "... — I'm Down For The Gospel — I'm Down For The Gospel" and wastes the
  // ~60 characters Google actually shows.
  const nameHasBrand = product.name.toLowerCase().includes(SITE_NAME.toLowerCase());
  const title =
    product.metaTitle?.trim() ||
    (nameHasBrand ? product.name : `${product.name} — ${SITE_NAME}`);
  const description =
    product.metaDescription?.trim() ||
    toMetaDescription(product.description) ||
    `${product.name} — hand-made, one-of-a-kind faith streetwear by Greg Romano.`;

  const cover = [...product.images].sort((a, b) => a.position - b.position)[0];
  const canonical = `/products/${product.slug}`;

  return {
    title,
    description,
    // Canonical per product, so query strings (utm_*, ?lookbook=) do not get
    // indexed as separate duplicate pages.
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonical),
      siteName: SITE_NAME,
      type: "website",
      ...(cover
        ? { images: [{ url: absoluteUrl(cover.url), alt: cover.alt || product.name }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(cover ? { images: [absoluteUrl(cover.url)] } : {}),
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const images = [...product.images]
    .sort((a, b) => a.position - b.position)
    .map((image) => ({ url: image.url, alt: image.alt }));

  // Product schema: this is what lets a search result show the price and
  // whether it is in stock, rather than just a blue link. Built from the same
  // values the page renders, so it cannot advertise a price the store does
  // not charge.
  const cover = images[0];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      toMetaDescription(product.description, 500) ?? `${product.name} by Greg Romano`,
    // Absolute: some product images are site-relative paths ("/shirt-back.png")
    // and Google rejects a relative URL in structured data, which would
    // invalidate the whole Offer block rather than just drop the image.
    ...(cover ? { image: [absoluteUrl(cover.url)] } : {}),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/products/${product.slug}`),
      priceCurrency: product.currency.toUpperCase(),
      // Schema.org wants a decimal string, not cents.
      price: (product.priceCents / 100).toFixed(2),
      availability:
        product.status === "active"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <main className="flex-1 bg-[var(--bg-primary)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/"
          className="text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
        >
          &larr; Back to shop
        </Link>
      </div>

      <section className="border-b border-[var(--border)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 sm:pb-24 lg:grid-cols-2 lg:items-start lg:gap-16">
          <ProductGallery images={images} />

          <ProductPurchasePanel
            productId={product.id}
            name={product.name}
            shippingCents={product.shippingCents}
            options={product.options}
            variants={product.variants.map((v) => ({
              id: v.id,
              optionValues: v.optionValues,
              priceCents: v.priceCents,
            }))}
          />
        </div>

        {product.description && (
          <div className="mx-auto max-w-6xl px-6 pb-16 sm:pb-24">
            <DescriptionText
              html={product.description}
              className="max-w-2xl text-lg text-[var(--text-body)]"
            />
          </div>
        )}
      </section>
    </main>
  );
}
