"use client";

import Image from "next/image";
import { useState } from "react";

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

  const pageCount = Math.max(1, Math.ceil(images.length / LIFESTYLE_PAGE_SIZE));
  // Guard against a stale page if the list ever shrinks under a live update.
  const current = Math.min(page, pageCount);
  const start = (current - 1) * LIFESTYLE_PAGE_SIZE;
  const visible = images.slice(start, start + LIFESTYLE_PAGE_SIZE);

  if (images.length === 0) return null;

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
    </>
  );
}
