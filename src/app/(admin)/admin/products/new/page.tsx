import Link from "next/link";

import ProductForm from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Link
        href="/admin/products"
        className="text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
      >
        ← Products
      </Link>

      <div className="mt-4">
        <span className="section-label">Catalog</span>
        <h1 className="!text-4xl mt-1 text-[var(--text-primary)]">New product</h1>
      </div>

      <ProductForm />
    </div>
  );
}
