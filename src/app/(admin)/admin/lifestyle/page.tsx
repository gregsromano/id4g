import LifestyleGrid from "@/components/admin/LifestyleGrid";
import SaveButton from "@/components/admin/SaveButton";
import UnsavedChangesForm from "@/components/admin/UnsavedChangesForm";
import { listLifestyleImages } from "@/lib/lifestyle";
import { LIFESTYLE_PAGE_SIZE } from "@/lib/lifestyle-constants";

import { removeLifestyleImageAction, saveLifestyleGallery } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLifestylePage() {
  const images = await listLifestyleImages();
  const pageCount = Math.ceil(images.length / LIFESTYLE_PAGE_SIZE);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="section-label">Storefront</span>
          <h1 className="!text-4xl mt-1 text-[var(--text-primary)]">Lifestyle</h1>
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-sm text-[var(--text-body)]">
        The lookbook gallery on the homepage. Images show in the order below,{" "}
        {LIFESTYLE_PAGE_SIZE} per page.{" "}
        {images.length > LIFESTYLE_PAGE_SIZE ? (
          <>
            There {pageCount === 1 ? "is" : "are"} currently{" "}
            <strong className="text-[var(--text-primary)]">{pageCount} pages</strong>, so
            visitors get page controls under the gallery.
          </>
        ) : (
          <>
            Add more than {LIFESTYLE_PAGE_SIZE} to split it into pages with next/previous
            controls.
          </>
        )}
      </p>

      {images.length === 0 ? (
        <p className="mt-10 border border-dashed border-[var(--border)] px-6 py-12 text-center text-sm text-[var(--text-muted)]">
          No lifestyle images yet. Use the “+” tile to add some.
        </p>
      ) : null}

      <UnsavedChangesForm action={saveLifestyleGallery} className="mt-8 block">
        <div className="mb-4 flex items-center justify-between gap-4">
          <span className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
            {images.length} image{images.length === 1 ? "" : "s"}
          </span>
          <SaveButton />
        </div>

        <LifestyleGrid
          images={images.map((img) => ({ id: img.id, url: img.url, alt: img.alt }))}
          removeAction={removeLifestyleImageAction}
        />
      </UnsavedChangesForm>
    </div>
  );
}
