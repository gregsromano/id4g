"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { isVideoUrl } from "@/lib/media";
import SoldOverlay from "@/components/SoldOverlay";

type QuickViewImage = { url: string; alt: string; posterUrl?: string | null };

export default function ProductQuickView({
  href,
  name,
  priceLabel,
  compareAtLabel,
  saleTagLabel,
  image,
  sold,
  compact,
}: {
  href: string;
  name: string;
  priceLabel: string;
  /** Regular price, shown struck through, when the product is on sale. */
  compareAtLabel?: string | null;
  /** Text of the SALE tag, e.g. "20% off sale"; see saleTagLabel in lib/product. */
  saleTagLabel?: string | null;
  image: QuickViewImage | undefined;
  sold?: boolean;
  /** Smaller card for the homepage's dense 5-across rows. */
  compact?: boolean;
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
          {/* The artwork shows whole (object-contain, no base zoom): photos
              shot edge to edge, like the tees, were losing their sleeves and
              hem to the old 1.2 crop. overflow-hidden keeps the small hover
              zoom from spilling over the product name below and the "Shop"
              heading above. */}
          <div className="relative aspect-square w-full overflow-hidden">
            {image ? (
              <>
                {/* No controls on the card: the whole tile is a Link to the
                    product, and a control bar would swallow taps meant to
                    open it. The clip just loops silently as motion; the
                    product page is where it gets a real player. */}
                {isVideoUrl(image.url) ? (
                  <video
                    src={image.url}
                    poster={image.posterUrl ?? undefined}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-label={image.alt || name}
                    className="pointer-events-none h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <Image
                    src={image.url}
                    alt={image.alt}
                    width={800}
                    height={800}
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                )}
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-[var(--text-muted)]">
                No image
              </div>
            )}

            {sold && <SoldOverlay size="sm" />}
            {compareAtLabel && (
              <span
                className={`absolute left-2 top-2 bg-[var(--sale-bg,var(--accent))] font-bold uppercase tracking-widest text-[var(--sale-fg,var(--on-accent))] ${
                  compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
                }`}
              >
                {saleTagLabel ?? "Sale"}
              </span>
            )}
          </div>
          <h3
            className={`font-semibold text-[var(--text-primary)] ${
              compact ? "mt-3 text-sm leading-snug" : "mt-4 text-lg"
            }`}
          >
            {name}
          </h3>
          <p className={`mt-1 font-bold text-[var(--accent)] ${compact ? "text-base" : "text-xl"}`}>
            {priceLabel}
            {compareAtLabel && (
              <span
                className={`ml-2 font-normal text-[var(--text-muted)] line-through ${
                  compact ? "text-xs" : "text-sm"
                }`}
              >
                <span className="sr-only">Regular price </span>
                {compareAtLabel}
              </span>
            )}
          </p>
        </Link>

        {image && !isVideoUrl(image.url) && (
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

      {/* Guarded as well as gated: the only button that opens this is already
          image-only, but next/image throws on a video source, so the check
          belongs at the render too. */}
      {open && image && !isVideoUrl(image.url) && (
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
