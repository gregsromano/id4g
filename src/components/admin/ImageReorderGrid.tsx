"use client";

import Image from "next/image";
import { useState } from "react";

import AddImageTile from "./AddImageTile";

type ImageItem = { url: string; alt: string };

/**
 * Existing images, drag-reorderable (native HTML5 drag-and-drop — desktop
 * only, no touch support; fine for a solo-admin back office). The new order
 * is expressed purely through DOM order of the image_url/image_alt hidden
 * fields this renders, which is what saveProductDetails reads via
 * formData.getAll() — so reordering, like labels, is only persisted when
 * the top Save button is clicked. "Set as cover" and "Remove" stay
 * immediate, independent actions via formAction overrides.
 */
export default function ImageReorderGrid({
  productId,
  images,
  setCoverAction,
  removeAction,
}: {
  productId: string;
  images: ImageItem[];
  setCoverAction: (formData: FormData) => void | Promise<void>;
  removeAction: (formData: FormData) => void | Promise<void>;
}) {
  const byUrl = new Map(images.map((img) => [img.url, img]));
  const [order, setOrder] = useState(images.map((img) => img.url));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function handleDrop(targetIndex: number) {
    setOverIndex(null);
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  }

  return (
    <div>
      {order.length > 1 && (
        <p className="mb-2 text-xs text-[var(--text-muted)]">Drag to reorder.</p>
      )}
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
        {order.map((url, index) => {
          const image = byUrl.get(url);
          if (!image) return null;
          return (
            <div
              key={url}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(index);
              }}
              onDragLeave={() => setOverIndex((i) => (i === index ? null : i))}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={`relative cursor-move ${
                overIndex === index && dragIndex !== null && dragIndex !== index
                  ? "opacity-60"
                  : ""
              }`}
            >
              <div
                className={`relative aspect-square border ${
                  overIndex === index && dragIndex !== null && dragIndex !== index
                    ? "border-[var(--accent)]"
                    : "border-[var(--border)]"
                }`}
              >
                <Image src={image.url} alt={image.alt} fill className="object-cover" />
                {index === 0 && (
                  <span className="absolute left-2 top-2 border border-[var(--accent)] bg-[var(--bg-primary)] px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--accent)]">
                    Cover
                  </span>
                )}
              </div>
              <input type="hidden" name="image_url" value={url} />
              <input
                name="image_alt"
                defaultValue={image.alt}
                placeholder="Label — Front, Back..."
                className="mt-2 w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
              {index !== 0 && (
                <button
                  type="submit"
                  formAction={setCoverAction}
                  formNoValidate
                  name="url"
                  value={url}
                  className="mt-2 w-full border border-[var(--border)] py-1 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  Set as cover
                </button>
              )}
              <button
                type="submit"
                formAction={removeAction}
                formNoValidate
                name="url"
                value={url}
                className="mt-2 w-full border border-[var(--border)] py-1 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:border-red-400 hover:text-red-400"
              >
                Remove
              </button>
            </div>
          );
        })}

        <AddImageTile productId={productId} />
      </div>
    </div>
  );
}
