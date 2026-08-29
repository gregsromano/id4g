"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { LIFESTYLE_PAGE_SIZE } from "@/lib/lifestyle-constants";

type Item = { id: string; url: string; alt: string };

/**
 * The lookbook mosaic.
 *
 * Layout is the original hand-tuned arrangement, now driven by data: a tall
 * hero spanning two rows, a stacked pair beside it, then a wide pair below.
 * With more than LIFESTYLE_PAGE_SIZE images that 5-slot pattern repeats a
 * page at a time rather than growing into an ever-taller column, so the
 * section keeps its proportions no matter how many photos exist.
 *
 * Slot geometry, by index within a page. Each entry carries the column span
 * and the intrinsic size hint passed to next/image; the aspect differences
 * are what give the mosaic its shape.
 */
const SLOTS = [
  { className: "lg:col-span-7 lg:row-span-2", width: 800, height: 1000, objectPosition: "" },
  { className: "lg:col-span-5", width: 800, height: 1000, objectPosition: "object-top" },
  { className: "lg:col-span-5", width: 800, height: 600, objectPosition: "" },
  { className: "lg:col-span-7", width: 800, height: 640, objectPosition: "" },
  { className: "lg:col-span-5", width: 800, height: 1000, objectPosition: "" },
];

export default function LifestyleGallery({ images }: { images: Item[] }) {
  const [page, setPage] = useState(1);
  // Index into `images` (not into the current page) of the photo open in the
  // lightbox, or null when closed — so arrow navigation can walk the whole
  // gallery rather than stopping at a page boundary.
  const [lightbox, setLightbox] = useState<number | null>(null);

  const pageCount = Math.max(1, Math.ceil(images.length / LIFESTYLE_PAGE_SIZE));
  // Guard against a stale page if the list ever shrinks under a live update.
  const current = Math.min(page, pageCount);
  const start = (current - 1) * LIFESTYLE_PAGE_SIZE;
  const visible = images.slice(start, start + LIFESTYLE_PAGE_SIZE);

  const show = useCallback(
    (index: number) => {
      if (images.length === 0) return;
      // Wrap around at both ends so the arrows never dead-end.
      const next = (index + images.length) % images.length;
      setLightbox(next);
      // Keep the mosaic behind the lightbox on the page that holds the photo
      // being viewed, so closing it leaves you where you ended up.
      setPage(Math.floor(next / LIFESTYLE_PAGE_SIZE) + 1);
    },
    [images.length],
  );

  useEffect(() => {
    if (lightbox === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") show((lightbox as number) + 1);
      if (e.key === "ArrowLeft") show((lightbox as number) - 1);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightbox, show]);

  if (images.length === 0) return null;

  const open = lightbox === null ? null : images[lightbox];

  return (
    <>
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-12">
        {visible.map((image, index) => {
          const slot = SLOTS[index % SLOTS.length];
          return (
            <figure
              key={image.id}
              className={`group relative overflow-hidden ${slot.className}`}
            >
              <Image
                src={image.url}
                alt={image.alt}
                width={slot.width}
                height={slot.height}
                className={`h-full w-full object-cover ${slot.objectPosition} transition-transform duration-700 group-hover:scale-105`}
              />

              {/* Same affordance as the shop grid: a "+" that fades in on
                  hover and opens the photo full-size. */}
              <button
                type="button"
                aria-label={`View larger image${image.alt ? `: ${image.alt}` : ""}`}
                onClick={() => show(start + index)}
                className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center border border-[var(--border)] bg-[var(--bg-primary)]/80 text-[var(--text-primary)] opacity-0 transition-opacity duration-200 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:opacity-100 group-hover:opacity-100"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="2" />
                  <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
            </figure>
          );
        })}
      </div>

      {/* Page controls appear only once there is more than one page. */}
      {pageCount > 1 && (
        <nav
          aria-label="Lifestyle gallery pages"
          className="mt-8 flex items-center justify-center gap-4"
        >
          <button
            type="button"
            onClick={() => setPage(current - 1)}
            disabled={current === 1}
            className="border border-[var(--border)] px-5 py-2.5 text-xs uppercase tracking-widest text-[var(--text-body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--text-body)]"
          >
            <span aria-hidden="true">‹</span> Prev
          </button>

          <p className="flex items-center gap-2 text-sm text-[var(--text-body)]">
            <span
              className="flex h-9 min-w-9 items-center justify-center border border-[var(--border)] px-2 text-[var(--text-primary)]"
              aria-current="page"
            >
              {current}
            </span>
            <span className="text-[var(--text-muted)]">of {pageCount}</span>
          </p>

          <button
            type="button"
            onClick={() => setPage(current + 1)}
            disabled={current === pageCount}
            className="border border-[var(--border)] px-5 py-2.5 text-xs uppercase tracking-widest text-[var(--text-body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--text-body)]"
          >
            Next <span aria-hidden="true">›</span>
          </button>
        </nav>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Lifestyle photo"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-6"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setLightbox(null)}
            className="absolute right-6 top-6 text-3xl leading-none text-white/80 transition-colors hover:text-white"
          >
            &times;
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  show((lightbox as number) - 1);
                }}
                className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center text-3xl leading-none text-white/70 transition-colors hover:text-white sm:left-8"
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  show((lightbox as number) + 1);
                }}
                className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center text-3xl leading-none text-white/70 transition-colors hover:text-white sm:right-8"
              >
                <span aria-hidden="true">›</span>
              </button>
            </>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-full w-full flex-col items-center justify-center gap-3"
          >
            <Image
              src={open.url}
              alt={open.alt}
              width={1600}
              height={1600}
              // The lightbox is the one place these photos are shown at full
              // size, so serve the original bytes rather than a re-encode:
              // the sources are only 800px wide, and the optimizer's next
              // bucket down (640px) visibly softens them on a large screen.
              unoptimized
              className="h-auto max-h-[calc(100vh-6rem)] w-auto max-w-full object-contain"
            />
            {open.alt && (
              <p className="shrink-0 text-center text-xs uppercase tracking-widest text-white/60">
                {open.alt}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
