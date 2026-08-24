import Image from "next/image";
import Link from "next/link";

import { formatPrice } from "@/lib/product";
import {
  getProductSummary,
  listProducts,
  priceRangeCents,
  totalStock,
  type Product,
  type ProductFilter,
} from "@/lib/products";
import ProductStatusPill from "@/components/admin/ProductStatusPill";
import { setProductStatusAction } from "./actions";

// Catalog data is mutable from this dashboard; never serve a cached copy.
export const dynamic = "force-dynamic";

const FILTERS: { value: ProductFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
];

function isFilter(value: string | undefined): value is ProductFilter {
  return (
    value === "all" || value === "active" || value === "draft" || value === "archived"
  );
}

function priceLabel(product: Product) {
  const { min, max } = priceRangeCents(product);
  return min === max ? formatPrice(min) : `${formatPrice(min)}–${formatPrice(max)}`;
}

/**
 * Inventory reads as three distinct states. Untracked is not a warning: it is
 * how the current live drop already sells, so it must not look like a problem.
 */
function stockLabel(product: Product): { text: string; tone: "muted" | "warn" | "bad" } {
  const total = totalStock(product);
  if (total === null) return { text: "Untracked", tone: "muted" };
  if (total === 0) return { text: "Sold out", tone: "bad" };

  const low = product.variants.filter((v) => v.stock !== null && v.stock > 0 && v.stock <= 5);
  if (low.length > 0) {
    return { text: `${total} left · ${low.length} size${low.length === 1 ? "" : "s"} low`, tone: "warn" };
  }
  return { text: `${total} in stock`, tone: "muted" };
}

export default async function AdminProductsPage({
  searchParams,
}: {
  // searchParams is a Promise in Next 16 — synchronous access was removed.
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filter: ProductFilter = isFilter(params.filter) ? params.filter : "all";
  const search = params.q?.trim() ?? "";

  const [summary, products] = await Promise.all([
    getProductSummary(),
    listProducts({ filter, search }),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="section-label">Catalog</span>
          <h1 className="!text-4xl mt-1 text-[var(--text-primary)]">Products</h1>
        </div>
        <Link href="/admin/products/new" className="btn-primary !py-3 !px-6">
          Add product
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-px border border-[var(--border)] bg-[var(--border)] lg:grid-cols-4">
        <Tile label="Products" value={String(summary.total)} />
        <Tile label="Active" value={String(summary.active)} />
        <Tile label="Drafts" value={String(summary.draft)} />
        <Tile
          label="Sold-out sizes"
          value={String(summary.soldOutVariants)}
          note={
            summary.missingImages > 0
              ? `${summary.missingImages} active product${
                  summary.missingImages === 1 ? "" : "s"
                } with no image`
              : undefined
          }
        />
      </div>

      {/* Filters and search are GET so every view is a shareable URL. */}
      <form className="mt-8 flex flex-wrap items-center gap-3" action="/admin/products">
        <div className="flex items-center gap-px border border-[var(--border)] bg-[var(--border)]">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`/admin/products?filter=${f.value}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
              className={`px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
                filter === f.value
                  ? "bg-[var(--bg-charcoal)] text-[var(--text-primary)]"
                  : "bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--accent)]"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <input type="hidden" name="filter" value={filter} />
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search name or slug"
          className="min-w-56 flex-1 border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
        <button type="submit" className="btn-outline !py-2 !px-5">
          Search
        </button>
      </form>

      {products.length === 0 ? (
        <EmptyState filter={filter} search={search} />
      ) : (
        <div className="mt-6 border border-[var(--border)]">
          {/* Column headers are decorative on mobile, where rows stack. */}
          <div className="hidden grid-cols-[64px_1fr_140px_140px_120px_88px] gap-4 border-b border-[var(--border)] px-4 py-3 lg:grid">
            <span className="section-label">Image</span>
            <span className="section-label">Product</span>
            <span className="section-label">Price</span>
            <span className="section-label">Inventory</span>
            <span className="section-label">Status</span>
            <span />
          </div>

          {products.map((product) => {
            const stock = stockLabel(product);
            const cover = product.images[0];

            return (
              <div
                key={product.id}
                className="grid grid-cols-[56px_1fr] items-center gap-4 border-b border-[var(--border)] px-4 py-4 last:border-b-0 lg:grid-cols-[64px_1fr_140px_140px_120px_88px]"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-[var(--border)] bg-[var(--bg-section-alt)] lg:h-16 lg:w-16">
                  {cover ? (
                    <Image
                      src={cover.storagePath}
                      alt={cover.alt ?? product.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                      None
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="block truncate text-sm text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
                  >
                    {product.name}
                  </Link>
                  <span className="mt-1 block truncate font-mono text-xs text-[var(--text-muted)]">
                    /{product.slug}
                  </span>

                  {/* Below lg the remaining columns collapse into this cell. */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 lg:hidden">
                    <span className="text-xs text-[var(--text-body)]">
                      {priceLabel(product)}
                    </span>
                    <StockText {...stock} />
                    <ProductStatusPill status={product.status} />
                  </div>
                </div>

                <span className="hidden text-sm text-[var(--text-body)] lg:block">
                  {priceLabel(product)}
                </span>
                <span className="hidden lg:block">
                  <StockText {...stock} />
                </span>
                <span className="hidden lg:block">
                  <ProductStatusPill status={product.status} />
                </span>

                <div className="hidden justify-end lg:flex">
                  <StatusToggle product={product} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-[var(--text-muted)]">
        Catalog changes are held in memory and reset when the dev server
        restarts. Nothing here touches the live store.
      </p>
    </div>
  );
}

function StockText({ text, tone }: { text: string; tone: "muted" | "warn" | "bad" }) {
  const color =
    tone === "bad"
      ? "text-red-400"
      : tone === "warn"
        ? "text-amber-400"
        : "text-[var(--text-muted)]";
  return <span className={`text-xs ${color}`}>{text}</span>;
}

/** One-click publish/unpublish, the action most used from a list view. */
function StatusToggle({ product }: { product: Product }) {
  if (product.status === "archived") return null;

  const next = product.status === "active" ? "draft" : "active";
  return (
    <form action={setProductStatusAction}>
      <input type="hidden" name="id" value={product.id} />
      <input type="hidden" name="status" value={next} />
      <button
        type="submit"
        className="text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
      >
        {next === "active" ? "Publish" : "Unpublish"}
      </button>
    </form>
  );
}

function EmptyState({ filter, search }: { filter: ProductFilter; search: string }) {
  const searching = search !== "";
  return (
    <div className="mt-6 border border-[var(--border)] px-6 py-16 text-center">
      <p className="text-sm text-[var(--text-body)]">
        {searching
          ? `No products match “${search}”.`
          : filter === "all"
            ? "No products yet."
            : `No ${filter} products.`}
      </p>
      {searching ? (
        <Link
          href="/admin/products"
          className="mt-4 inline-block text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
        >
          Clear search
        </Link>
      ) : (
        <Link href="/admin/products/new" className="btn-primary mt-6 inline-block">
          Add your first product
        </Link>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="bg-[var(--bg-primary)] p-5">
      <span className="section-label">{label}</span>
      <p className="mt-2 text-3xl text-[var(--text-primary)]">{value}</p>
      {note && <p className="mt-1 text-xs text-[var(--text-muted)]">{note}</p>}
    </div>
  );
}
