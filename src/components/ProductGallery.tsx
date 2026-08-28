"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type GalleryImage = { url: string; alt: string };

export default function ProductGallery({ images }: { images: GalleryImage[] }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const active = images[index];

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div>
      <div className="group relative aspect-square w-full overflow-hidden">
        {active ? (
          <>
            <Image
              src={active.url}
              alt={active.alt}
              width={1200}
              height={1200}
              className="h-full w-full object-contain"
            />
            <button
              type="button"
              aria-label="View larger image"
              onClick={() => setOpen(true)}
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center border border-[var(--border)] bg-[var(--bg-primary)]/80 text-[var(--text-primary)] opacity-0 transition-opacity duration-200 hover:border-[var(--accent)] hover:text-[var(--accent)] group-hover:opacity-100"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="2" />
                <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-[var(--text-muted)]">
            No image
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-3 border-t border-[var(--border)] pt-3">
          {images.map((image, i) => (
            <button
              key={image.url}
              onClick={() => setIndex(i)}
              title={image.alt || undefined}
              className={`h-16 w-16 overflow-hidden border transition-colors ${
                i === index ? "border-[var(--accent)]" : "border-[var(--border)]"
              }`}
            >
              <Image
                src={image.url}
                alt={image.alt}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {active?.alt && (
        <p className="mt-2 text-center text-xs uppercase tracking-widest text-[var(--text-muted)]">
          {active.alt}
        </p>
      )}

      {open && active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Larger image"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute right-6 top-6 text-3xl leading-none text-white/80 transition-colors hover:text-white"
          >
            &times;
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative h-full max-h-[85vh] w-full max-w-3xl"
          >
            <Image
              src={active.url}
              alt={active.alt}
              width={1400}
              height={1400}
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
