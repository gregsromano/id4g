"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type QuickViewImage = { url: string; alt: string };

export default function ProductQuickView({
  href,
  name,
  priceLabel,
  image,
}: {
  href: string;
  name: string;
  priceLabel: string;
  image: QuickViewImage | undefined;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <div className="group relative">
        <Link href={href} className="block">
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

        {image && (
          <button
            type="button"
            aria-label={`View larger image of ${name}`}
            onClick={() => setOpen(true)}
            className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center border border-[var(--border)] bg-[var(--bg-primary)]/80 text-[var(--text-primary)] opacity-0 transition-opacity duration-200 hover:border-[var(--accent)] hover:text-[var(--accent)] group-hover:opacity-100"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="2" />
              <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        )}
      </div>

      {open && image && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} — larger image`}
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
              src={image.url}
              alt={image.alt}
              width={1400}
              height={1400}
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
