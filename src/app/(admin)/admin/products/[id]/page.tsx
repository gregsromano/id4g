import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import ProductForm from "@/components/admin/ProductForm";
import ProductStatusPill from "@/components/admin/ProductStatusPill";
import VariantsTable from "@/components/admin/VariantsTable";
import { getProduct } from "@/lib/products";
import { deleteProductAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  // params is a Promise in Next 16 — synchronous access was removed.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Link
        href="/admin/products"
        className="text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
      >
        ← Products
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="section-label">Catalog</span>
          <h1 className="!text-4xl mt-1 truncate text-[var(--text-primary)]">
            {product.name}
          </h1>
          <span className="mt-2 block font-mono text-xs text-[var(--text-muted)]">
            /{product.slug}
          </span>
        </div>
        <ProductStatusPill status={product.status} />
      </div>

      <ProductForm product={product} />

      <ImageManager product={product} />

      <VariantsTable product={product} />

      <section className="mt-16 border-t border-[var(--border)] pt-8">
        <span className="section-label">Danger zone</span>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border border-red-400/30 p-5">
          <p className="max-w-md text-sm text-[var(--text-muted)]">
            Deleting removes the product and all its sizes. Archive instead if it
            has ever been ordered — order history references it.
          </p>
          <form action={deleteProductAction}>
            <input type="hidden" name="id" value={product.id} />
            <button
              type="submit"
              className="border border-red-400 px-5 py-2 text-xs uppercase tracking-widest text-red-400 transition-colors hover:bg-red-400 hover:text-[var(--bg-primary)]"
            >
              Delete product
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

/**
 * Image manager.
 *
 * Read-only for now: uploading needs a Supabase Storage bucket, which does not
 * exist on Greg's project yet. The layout is the real one, so wiring uploads
 * later is a change to this component rather than a new design.
 */
function ImageManager({
  product,
}: {
  product: Awaited<ReturnType<typeof getProduct>> & object;
}) {
  return (
    <section className="mt-12">
      <span className="section-label">Images</span>

      <div className="mt-4 flex flex-wrap gap-4">
        {product.images.map((image, index) => (
          <figure
            key={image.id}
            className="relative h-32 w-32 overflow-hidden border border-[var(--border)] bg-[var(--bg-section-alt)]"
          >
            <Image
              src={image.storagePath}
              alt={image.alt ?? product.name}
              fill
              sizes="128px"
              className="object-cover"
            />
            {index === 0 && (
              <figcaption className="absolute inset-x-0 bottom-0 bg-[var(--bg-primary)]/85 py-1 text-center text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                Cover
              </figcaption>
            )}
          </figure>
        ))}

        <div className="flex h-32 w-32 flex-col items-center justify-center border border-dashed border-[var(--border)] px-2 text-center">
          <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            Upload
          </span>
          <span className="mt-1 text-[10px] text-[var(--text-muted)]">
            needs Storage
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Uploads are inactive until a Supabase Storage bucket exists on the
        project. Images shown are the current static files from /public.
      </p>
    </section>
  );
}
