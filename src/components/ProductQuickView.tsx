"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type QuickViewImage = { url: string; alt: string };

export default function ProductQuickView({
  href,
  name,
  priceLabel,
  images,
}: {
  href: string;
  name: string;
  priceLabel: string;
  images: QuickViewImage[];
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const image = images[0];
  const active = images[activeIndex] ?? image;

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") {
        setActiveIndex((i) => (i + 1) % images.length);
      }
      if (e.key === "ArrowLeft") {
        setActiveIndex((i) => (i - 1 + images.length) % images.length);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, images.length]);

  return (
    <>
      <Link href={href} className="group block">
        <div className="relative aspect-square w-full">
          {image ? (
            <>
              <Image
                src={image.url}
                alt={image.alt}
                width={800}
                height={800}
                className="h-full w-full scale-[1.2] object-contain transition-transform duration-500 group-hover:scale-[1.26]"
              />
              {image.alt && (
                <span className="absolute bottom-2 left-2 border border-[var(--border)] bg-[var(--bg-primary)]/80 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                  {image.alt}
                </span>
              )}

              <button
                type="button"
                aria-label={`View larger image of ${name}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveIndex(0);
                  setOpen(true);
                }}
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center border border-[var(--border)] bg-[var(--bg-primary)]/80 text-[var(--text-primary)] opacity-0 transition-opacity duration-200 hover:border-[var(--accent)] hover:text-[var(--accent)] group-hover:opacity-100"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                >
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
        <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
          {name}
        </h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{priceLabel}</p>
      </Link>

      {open && active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} — larger image`}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 p-6"
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
            className="relative flex w-full max-w-3xl flex-1 items-center justify-center"
          >
            {images.length > 1 && (
              <button
                type="button"
                aria-label="Previous image"
                onClick={() =>
                  setActiveIndex((i) => (i - 1 + images.length) % images.length)
                }
                className="absolute left-0 z-10 flex h-10 w-10 items-center justify-center text-white/70 transition-colors hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M12 4 6 10l6 6" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </button>
            )}

            <div className="relative h-full max-h-[75vh] w-full">
              <Image
                src={active.url}
                alt={active.alt}
                width={1400}
                height={1400}
                className="h-full w-full object-contain"
              />
            </div>

            {images.length > 1 && (
              <button
                type="button"
                aria-label="Next image"
                onClick={() => setActiveIndex((i) => (i + 1) % images.length)}
                className="absolute right-0 z-10 flex h-10 w-10 items-center justify-center text-white/70 transition-colors hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="m8 4 6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </button>
            )}
          </div>

          {images.length > 1 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex gap-3"
            >
              {images.map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  title={img.alt || undefined}
                  className={`h-14 w-14 overflow-hidden border transition-colors ${
                    i === activeIndex ? "border-[var(--accent)]" : "border-white/20"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
