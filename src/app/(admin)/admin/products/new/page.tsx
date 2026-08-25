import Link from "next/link";

import NewProductForm from "@/components/admin/NewProductForm";

export default function NewProductPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/admin/products"
        className="text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
      >
        &larr; Back to products
      </Link>

      <div className="mt-4">
        <span className="section-label">Catalog</span>
        <h1 className="!text-4xl mt-1 text-[var(--text-primary)]">New product</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Created as a draft. Add images and fine-tune variant prices on the next screen, then
          switch it to Active when it&apos;s ready for the storefront.
        </p>
      </div>

      <NewProductForm />
    </div>
  );
}
