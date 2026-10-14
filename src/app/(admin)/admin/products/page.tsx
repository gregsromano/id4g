import Link from "next/link";

import { listAllProductsForAdmin, type ProductFilter } from "@/lib/products";
import { getSiteSettings } from "@/lib/settings";
import ProductsTable from "@/components/admin/ProductsTable";
import RandomizeToggle from "@/components/admin/RandomizeToggle";

export const dynamic = "force-dynamic";

const FILTERS: { value: ProductFilter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

function isFilter(value: string | undefined): value is ProductFilter {
  return value === "active" || value === "draft" || value === "archived" || value === "all";
}

/**
 * A free-text category value, same as `PRODUCT_CATEGORIES` — but this tab is
 * deliberately just the one category admins actually asked to arrange
 * separately, not a generic filter over the whole list. Add another entry
 * here if a second category needs its own tab later.
 */
const CATEGORY_TABS = [{ value: "One of One", label: "One of One" }];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; category?: string }>;
}) {
  const params = await searchParams;
  const filter: ProductFilter = isFilter(params.filter) ? params.filter : "active";
  const category = CATEGORY_TABS.find((c) => c.value === params.category)?.value;

  // Independent reads, so run them concurrently rather than serializing two
  // round trips on a force-dynamic page.
  // The pin list is fetched separately and always unfiltered: building it
  // from the filtered view emptied the dropdown on the Draft/Archived tabs,
  // which made an already-pinned product look unset.
  const [products, pinnable, settings] = await Promise.all([
    listAllProductsForAdmin(filter, category),
    listAllProductsForAdmin("active"),
    getSiteSettings(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div>
        <span className="section-label">Catalog</span>
        <h1 className="!text-4xl mt-1 text-[var(--text-primary)]">
          {category ?? "Products"}
        </h1>
        {category && (
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Drag to set the order these show in on the storefront&apos;s{" "}
            <code className="text-[var(--text-primary)]">/one-of-one</code> page.
          </p>
        )}
      </div>

      <RandomizeToggle
        enabled={settings.randomizeProducts}
        pinnedProductId={settings.pinnedProductId}
        // Only active products reach the storefront, so only they can
        // meaningfully hold first place on it.
        products={pinnable.map((product) => ({ id: product.id, name: product.name }))}
      />

      <nav className="mt-8 flex flex-wrap gap-6 border-b border-[var(--border)] pb-4">
        <Link
          href={`/admin/products?filter=${filter}`}
          className={`text-xs uppercase tracking-widest transition-colors ${
            !category
              ? "text-[var(--accent)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          All Categories
        </Link>
        {CATEGORY_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/products?filter=${filter}&category=${encodeURIComponent(tab.value)}`}
            className={`text-xs uppercase tracking-widest transition-colors ${
              category === tab.value
                ? "text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <nav className="mt-4 flex gap-6 border-b border-[var(--border)] pb-4">
        {FILTERS.map((option) => (
          <Link
            key={option.value}
            href={`/admin/products?filter=${option.value}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
            className={`text-xs uppercase tracking-widest transition-colors ${
              option.value === filter
                ? "text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      <ProductsTable
        key={`${filter}-${category ?? "all"}`}
        products={products}
        filter={filter}
        category={category}
        orderInUse={!settings.randomizeProducts}
      />
    </div>
  );
}
