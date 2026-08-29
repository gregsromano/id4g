"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { uploadLifestyleImages } from "@/app/(admin)/admin/lifestyle/actions";

/**
 * Grid-cell "+" upload button for the lifestyle gallery. Mirrors
 * AddImageTile (the product-image equivalent): deliberately NOT inside any
 * <form>, since it sits in the same visual grid as the Save form's fields but
 * must stay independent of that form's submit lifecycle. Calls the upload
 * server action directly, because that is what the "+" tap actually triggers
 * — an immediate upload, not something deferred to the Save button.
 *
 * That direct call is also why `router.refresh()` is required. The action
 * calls revalidatePath, but that only invalidates the server cache; it
 * re-renders the route on a FORM submission, not on a plain async call like
 * this one. Without the refresh the upload really did succeed — row written,
 * file stored — while the grid kept showing the old list, which reads as
 * "the button did nothing" and invites uploading the same photo again.
 */
export default function AddLifestyleTile() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (const file of Array.from(files)) formData.append("files", file);

    startTransition(async () => {
      setError(null);
      const result = await uploadLifestyleImages(null, formData);
      if (!result.ok) setError(result.message);
      else router.refresh();
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <label
      className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 border border-dashed text-[var(--text-muted)] transition-colors ${
        isPending
          ? "border-[var(--border)]"
          : "border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
      }`}
    >
      {isPending ? (
        <Spinner />
      ) : (
        <>
          <span className="text-3xl leading-none">+</span>
          <span className="text-[10px] uppercase tracking-widest">Add images</span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        disabled={isPending}
        onChange={handleChange}
        className="hidden"
      />
      {error && (
        <span className="absolute inset-x-1 bottom-1 text-center text-[9px] leading-tight text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}

function Spinner() {
  return (
    <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
