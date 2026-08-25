"use client";

import Image from "next/image";
import { useState } from "react";

type GalleryImage = { url: string; alt: string };

export default function ProductGallery({ images }: { images: GalleryImage[] }) {
  const [index, setIndex] = useState(0);
  const active = images[index];

  return (
    <div>
      <div className="aspect-square w-full overflow-hidden border border-[var(--border)] bg-[var(--bg-section-alt)]">
        {active ? (
          <Image
            src={active.url}
            alt={active.alt}
            width={1200}
            height={1200}
            className="h-full w-full object-contain"
          />
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
    </div>
  );
}
