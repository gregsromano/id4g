import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProductBySlug } from "@/lib/products";
import { stripHtmlToText } from "@/lib/rich-text";
import DescriptionText from "@/components/DescriptionText";
import ProductGallery from "@/components/ProductGallery";
import ProductPurchasePanel from "@/components/ProductPurchasePanel";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const title = product.metaTitle?.trim() || product.name;
  const description =
    product.metaDescription?.trim() || stripHtmlToText(product.description ?? "", 160);
  const image = [...product.images].sort((a, b) => a.position - b.position)[0];

  return {
    title,
    description: description || undefined,
    openGraph: {
      title,
      description: description || undefined,
      images: image ? [{ url: image.url, alt: image.alt }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description || undefined,
      images: image ? [image.url] : undefined,
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

  return (
    <main className="flex-1 bg-[var(--bg-primary)]">
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
