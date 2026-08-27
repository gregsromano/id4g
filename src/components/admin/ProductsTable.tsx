"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { reorderProductsAction } from "@/app/(admin)/admin/products/actions";
import { formatPrice } from "@/lib/product";
import type { AdminProductSummary, ProductFilter } from "@/lib/products";

/**
 * Drag-and-drop reordering (native HTML5 DnD — desktop only, no touch
 * support) replacing the old up/down buttons. Dragging only reorders local
 * state — nothing is persisted until "Save order" is clicked, same pattern
 * as the product edit page (edit, then an explicit Save), rather than firing
 * a server action on every drop with no visible confirmation it worked.
 */
export default function ProductsTable({
  products: initialProducts,
  filter,
}: {
  products: AdminProductSummary[];
  filter: ProductFilter;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [justSaved, setJustSaved] = useState(false);
  const wasPending = useRef(false);

  const dirty = products.some((p, i) => p.id !== initialProducts[i]?.id);

  // "Saved" stays put once a save completes — no auto-revert timer — until
  // the next drag creates a fresh unsaved change.
  useEffect(() => {
    if (wasPending.current && !isPending) {
      setJustSaved(true);
    }
    wasPending.current = isPending;
  }, [isPending]);

  function handleDrop(targetIndex: number) {
    setOverIndex(null);
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }

    setProducts((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
    setJustSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await reorderProductsAction(
        products.map((p) => p.id),
        filter,
      );
    });
  }

  return (
    <div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-[var(--text-muted)]">
          {products.length > 1 ? "Drag a row to reorder, then save." : ""}
        </p>
        <div className="flex items-center gap-3">
          {dirty && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="btn-outline !py-2 !px-6 disabled:opacity-40"
            >
              {isPending ? "Saving..." : justSaved ? "Saved" : "Save"}
            </button>
          )}
          <Link href="/admin/products/new" className="btn-primary !py-2 !px-6">
            New product
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--text-muted)]">
          No products in this view.
        </p>
      ) : (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-2xl border-collapse text-left">
          <thead>
            <tr className="bg-[var(--bg-section-alt)]">
              <Th>Order</Th>
              <Th>Thumbnail</Th>
              <Th>Name</Th>
              <Th>Category</Th>
              <Th>Status</Th>
              <Th>Price</Th>
              <Th>Variants</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => {
              const cover = [...product.images].sort((a, b) => a.position - b.position)[0];
              return (
                <tr
                  key={product.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverIndex(index);
                  }}
                  onDragLeave={() => setOverIndex((i) => (i === index ? null : i))}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  className={`cursor-move border-b border-[var(--border)] transition-colors hover:bg-[var(--bg-section-alt)] ${
                    overIndex === index && dragIndex !== null && dragIndex !== index
                      ? "bg-[var(--bg-section-alt)] outline outline-1 outline-[var(--accent)]"
                      : ""
                  }`}
                >
                  <Td>
                    <span
                      aria-label="Drag to reorder"
                      className="inline-block select-none text-sm text-[var(--text-muted)]"
                    >
                      &#8942;&#8942;
                    </span>
                  </Td>
                  <Td>
                    <div className="relative h-12 w-12 overflow-hidden border border-[var(--border)] bg-[var(--bg-section-alt)]">
                      {cover ? (
                        <Image src={cover.url} alt={cover.alt} fill className="object-cover" />
                      ) : null}
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
              );
            })}
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
