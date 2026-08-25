"use client";

import { useActionState } from "react";

import { uploadProductImages, type UploadImagesResult } from "@/app/(admin)/admin/products/actions";

export default function ProductImagesForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState<UploadImagesResult | null, FormData>(
    uploadProductImages,
    null,
  );

  return (
    <form action={action}>
      <input type="hidden" name="id" value={productId} />
      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
          Add images
        </span>
        <input
          type="file"
          name="files"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="w-full text-sm text-[var(--text-body)] file:mr-4 file:border file:border-[var(--border)] file:bg-[var(--bg-section-alt)] file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-widest file:text-[var(--text-body)]"
        />
      </label>

      <button type="submit" disabled={pending} className="btn-primary mt-4">
        {pending ? "Uploading..." : "Upload"}
      </button>

      {state && (
        <p
          className={`mt-3 text-sm ${state.ok ? "text-[var(--text-muted)]" : "text-red-400"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
