import type { ProductStatus } from "@/lib/product-types";

/**
 * Product-status counterpart to `StatusPill`.
 *
 * Kept separate rather than widening StatusPill's `OrderStatus` union: order
 * and product statuses are unrelated vocabularies, and merging them would let
 * an order render as "draft".
 */
const STYLES: Record<ProductStatus, string> = {
  draft: "border-[var(--text-muted)] text-[var(--text-muted)]",
  active: "border-[var(--accent)] text-[var(--accent)]",
  archived: "border-[var(--border)] text-[var(--text-muted)]",
};

export default function ProductStatusPill({ status }: { status: ProductStatus }) {
  return (
    <span
      className={`inline-block border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
