import Link from "next/link";

import { listAllProductsForAdmin, type ProductFilter } from "@/lib/products";
import { formatPrice } from "@/lib/product";
import { reorderProductAction } from "./actions";

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
        <div className="overflow-x-auto">
          <table className="w-full min-w-2xl border-collapse text-left">
            <thead>
              <tr className="bg-[var(--bg-section-alt)]">
                <Th>Order</Th>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th>Price</Th>
                <Th>Variants</Th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <tr
                  key={product.id}
                  className="border-b border-[var(--border)] transition-colors hover:bg-[var(--bg-section-alt)]"
                >
                  <Td>
                    <div className="flex gap-1">
                      <form action={reorderProductAction}>
                        <input type="hidden" name="id" value={product.id} />
                        <input type="hidden" name="direction" value="up" />
                        <input type="hidden" name="filter" value={filter} />
                        <button
                          type="submit"
                          disabled={index === 0}
                          aria-label="Move up"
                          className="h-6 w-6 border border-[var(--border)] text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-30"
                        >
                          &uarr;
                        </button>
                      </form>
                      <form action={reorderProductAction}>
                        <input type="hidden" name="id" value={product.id} />
                        <input type="hidden" name="direction" value="down" />
                        <input type="hidden" name="filter" value={filter} />
                        <button
                          type="submit"
                          disabled={index === products.length - 1}
                          aria-label="Move down"
                          className="h-6 w-6 border border-[var(--border)] text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-30"
                        >
                          &darr;
                        </button>
                      </form>
                    </div>
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
                    >
                      {product.name}
                    </Link>
                    <span className="block text-xs text-[var(--text-muted)]">
                      /{product.slug}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs text-[var(--text-muted)]">
                      {product.category ?? "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
                      {product.status}
                    </span>
                  </Td>
                  <Td>
                    {product.minPriceCents === product.maxPriceCents
                      ? formatPrice(product.minPriceCents)
                      : `${formatPrice(product.minPriceCents)} – ${formatPrice(product.maxPriceCents)}`}
                  </Td>
                  <Td>{product.variantCount}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-[var(--border)] px-4 py-3 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-4 text-sm text-[var(--text-body)]">{children}</td>;
}
