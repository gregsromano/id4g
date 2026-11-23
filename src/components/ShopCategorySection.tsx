import { listingPriceLabels } from "@/lib/product";
import type { Product } from "@/lib/products";
import { getSiteSettings } from "@/lib/settings";
import ProductQuickView from "@/components/ProductQuickView";

/** Product grid for a single-category shop page — same markup as the homepage's #shop section, scoped to one category. */
export default async function ShopCategorySection({
  eyebrow,
  title,
  products,
}: {
  eyebrow: string;
  title: string;
  products: Product[];
}) {
  // Read here rather than threaded through all four category pages. Never
  // throws — a settings failure just means no site-wide discount shows.
  const { sitewideSale } = await getSiteSettings();

  return (
    <section className="border-b border-[var(--border)]">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <span className="section-label mb-3">{eyebrow}</span>
        <h1 className="mb-10 text-4xl sm:text-5xl">{title}</h1>

        {products.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Nothing in stock right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-x-16 lg:grid-cols-3">
            {products.map((product) => (
              <ProductQuickView
                key={product.id}
                href={`/products/${product.slug}`}
                name={product.name}
                {...listingPriceLabels(product, sitewideSale)}
                image={product.images[0]}
                sold={product.sold}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
