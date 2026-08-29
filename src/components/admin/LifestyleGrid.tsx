"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import AddLifestyleTile from "./AddLifestyleTile";
import { LIFESTYLE_PAGE_SIZE } from "@/lib/lifestyle-constants";

type Item = { id: string; url: string; alt: string };

/**
 * Existing lifestyle images, drag-reorderable (native HTML5 drag-and-drop —
 * desktop only, no touch support; fine for a solo-admin back office). Mirrors
 * ImageReorderGrid, which does the same job for a single product's images.
 *
 * The new order is expressed purely through DOM order of the image_id /
 * image_alt hidden fields this renders, which is what saveLifestyleGallery
 * reads via formData.getAll() — so reordering, like alt text, is only
 * persisted when Save is clicked. "Remove" stays an immediate, independent
 * action via a formAction override.
 */
export default function LifestyleGrid({
  images,
  removeAction,
}: {
  images: Item[];
  removeAction: (id: string, formData: FormData) => void | Promise<void>;
}) {
  const byId = new Map(images.map((img) => [img.id, img]));
  const [order, setOrder] = useState(images.map((img) => img.id));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // `order` is local state so a drag can reorder without a server round trip,
  // but that means it is seeded ONCE and would otherwise ignore every later
  // server render — an upload would write its row and store its file while
  // this grid kept showing the old list, which reads as "the + button did
  // nothing". Re-seed whenever the set of ids from the server actually
  // changes (added or removed), comparing as a set so a pure reorder the
  // admin just made by dragging is not clobbered.
  const serverIds = images.map((img) => img.id);
  const serverKey = [...serverIds].sort().join(",");
  const lastServerKey = useRef(serverKey);
  useEffect(() => {
    if (lastServerKey.current === serverKey) return;
    lastServerKey.current = serverKey;
    setOrder(serverIds);
    // serverIds is derived from serverKey; depending on the string keeps this
    // from firing on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

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
        <p className="mb-2 text-xs text-[var(--text-muted)]">
          Drag to reorder. The first image is the large one in each row of the
          storefront mosaic.
        </p>
      )}
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
        {order.map((id, index) => {
          const image = byId.get(id);
          if (!image) return null;

          // Which storefront page this image lands on, given the mosaic
          // paginates every LIFESTYLE_PAGE_SIZE images. Only worth showing
          // once there is more than one page.
          const page = Math.floor(index / LIFESTYLE_PAGE_SIZE) + 1;
          const showPage = order.length > LIFESTYLE_PAGE_SIZE;

          return (
            <div
              key={id}
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
                {showPage && (
                  <span className="absolute left-2 top-2 border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                    Page {page}
                  </span>
                )}
              </div>
              <input type="hidden" name="image_id" value={id} />
              <input
                name="image_alt"
                defaultValue={image.alt}
                placeholder="Describe the photo"
                className="mt-2 w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
              {/* The id is bound into the action rather than carried by
                  name/value on the button: React overwrites a submit button's
                  `name` with its own $ACTION_ID_… when that button has a
                  `formAction` server action, so name/value never reaches the
                  server and formData.get("id") comes back empty. */}
              <button
                type="submit"
                formAction={removeAction.bind(null, id)}
                formNoValidate
                className="mt-2 w-full border border-[var(--border)] py-1 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:border-red-400 hover:text-red-400"
              >
                Remove
              </button>
            </div>
          );
        })}

        <AddLifestyleTile />
      </div>
    </div>
  );
}
