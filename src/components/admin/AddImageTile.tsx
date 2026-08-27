"use client";

import { useRef, useState, useTransition } from "react";

import { uploadProductImages } from "@/app/(admin)/admin/products/actions";

/**
 * Grid-cell "+" upload button — not inside any <form>, since it lives inside
 * the same visual grid as the Details form's fields but must stay
 * independent of that form's submit/validation lifecycle. Calls the upload
 * server action directly (a plain async function call, not a form binding),
 * which is what the "+" tap actually triggers: an immediate upload, not
 * something deferred to the top Save button.
 */
export default function AddImageTile({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    formData.append("id", productId);
    for (const file of Array.from(files)) formData.append("files", file);

    startTransition(async () => {
      setError(null);
      const result = await uploadProductImages(null, formData);
      if (!result.ok) setError(result.message);
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
