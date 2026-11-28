"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { isVideoUrl } from "@/lib/media";
import SoldOverlay from "@/components/SoldOverlay";
import { parseCardFit } from "@/lib/card-fit";

type GalleryImage = { url: string; alt: string; posterUrl?: string | null; cardFit?: unknown };

export default function ProductGallery({
  images,
  sold,
}: {
  images: GalleryImage[];
  sold?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const active = images[index];
  // The photo's subject (the garment itself) inside the square, so a click
  // on it opens the larger view but a click on the empty space around it
  // doesn't. A photo with no measured fit already fills the square.
  const subject = parseCardFit(active?.cardFit) ?? { l: 0, t: 0, r: 1, b: 1 };

  // The larger view steps through photos only: a video already plays inline
  // on the page, so it's skipped rather than shown as a second player.
  const photoIndexes = images.flatMap((image, i) => (isVideoUrl(image.url) ? [] : [i]));
  const canStep = photoIndexes.length > 1;
  const touchStartX = useRef<number | null>(null);

  /** Next (+1) or previous (-1) photo, wrapping around; the page's main photo follows. */
  function step(direction: 1 | -1) {
    setIndex((current) => {
      const at = photoIndexes.indexOf(current);
      if (at === -1 || photoIndexes.length === 0) return current;
      return photoIndexes[(at + direction + photoIndexes.length) % photoIndexes.length];
    });
  }

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // step only reads `images` (via photoIndexes), which this effect tracks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, images]);

  return (
    <div>
      <div className="group relative aspect-square w-full overflow-hidden">
        {active ? (
          <>
            {isVideoUrl(active.url) ? (
              /* autoPlay REQUIRES muted to be honored by browsers, and
                 playsInline keeps iOS Safari from hijacking it into
                 fullscreen. Controls stay on so the clip can be paused. */
              <video
                src={active.url}
                poster={active.posterUrl ?? undefined}
                autoPlay
                muted
                loop
                playsInline
                controls
                preload="metadata"
                aria-label={active.alt || "Product video"}
                className="h-full w-full object-contain"
              />
            ) : (
              <Image
                src={active.url}
                alt={active.alt}
                width={1200}
                height={1200}
                className="h-full w-full object-contain"
              />
            )}
            {/* Images only: the video already plays inline with its own
                controls, so a lightbox copy would just be a second player
                competing with the first — and its button would sit over the
                scrubber on small screens. */}
            {!isVideoUrl(active.url) && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                style={{
                  left: `${subject.l * 100}%`,
                  top: `${subject.t * 100}%`,
                  width: `${(subject.r - subject.l) * 100}%`,
                  height: `${(subject.b - subject.t) * 100}%`,
                }}
                // Pointer shortcut only; the + button is the one keyboard and
                // screen-reader users get, so they don't hear it twice.
                tabIndex={-1}
                aria-hidden
                className="absolute cursor-zoom-in"
              />
            )}
            {!isVideoUrl(active.url) && (
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
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-[var(--text-muted)]">
            No image
          </div>
        )}

        {sold && <SoldOverlay />}
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
              {/* Thumbnail videos never play — muted, no autoplay, metadata
                  only, so the strip stays a still preview and does not pull
                  down every clip's bytes on page load. */}
              {isVideoUrl(image.url) ? (
                <video
                  src={image.url}
                  poster={image.posterUrl ?? undefined}
                  muted
                  playsInline
                  preload="metadata"
                  aria-label={image.alt || "Product video"}
                  className="pointer-events-none h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={image.url}
                  alt={image.alt}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* isVideoUrl is re-checked, not assumed: the button that sets `open`
          is already image-only, but this is the call that would throw if a
          later change ever let a video through. */}
      {open && active && !isVideoUrl(active.url) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Larger image"
          onClick={() => setOpen(false)}
          // Swipe left/right on a phone to change photo.
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current;
            touchStartX.current = null;
            const end = e.changedTouches[0]?.clientX;
            if (!canStep || start === null || end === undefined) return;
            if (Math.abs(end - start) > 50) step(end < start ? 1 : -1);
          }}
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

          {canStep && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-white/30 bg-black/60 text-white/80 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] sm:left-6"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <polyline points="13,3 6,10 13,17" stroke="currentColor" strokeWidth="2.5" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-white/30 bg-black/60 text-white/80 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] sm:right-6"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <polyline points="7,3 14,10 7,17" stroke="currentColor" strokeWidth="2.5" />
                </svg>
              </button>
              <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-white/70">
                {photoIndexes.indexOf(index) + 1} / {photoIndexes.length}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
