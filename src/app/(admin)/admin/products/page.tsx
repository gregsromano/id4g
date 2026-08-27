import Link from "next/link";

import { listAllProductsForAdmin, type ProductFilter } from "@/lib/products";
import ProductsTable from "@/components/admin/ProductsTable";

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

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter: ProductFilter = isFilter(params.filter) ? params.filter : "active";

  const products = await listAllProductsForAdmin(filter);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="section-label">Catalog</span>
          <h1 className="!text-4xl mt-1 text-[var(--text-primary)]">Products</h1>
        </div>
        <Link href="/admin/products/new" className="btn-primary !py-3 !px-6">
          New product
        </Link>
      </div>

      <nav className="mt-8 flex gap-6 border-b border-[var(--border)] pb-4">
        {FILTERS.map((option) => (
          <Link
            key={option.value}
            href={`/admin/products?filter=${option.value}`}
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

      {products.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--text-muted)]">
          No products in this view.
        </p>
      ) : (
        <ProductsTable key={filter} products={products} filter={filter} />
      )}
    </div>
  );
}
