"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import {
  attachProductUpload,
  createProductUploadUrl,
} from "@/app/(admin)/admin/products/actions";
import { getSupabase } from "@/lib/supabase";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/**
 * Grid-cell "+" upload button — not inside any <form>, since it lives inside
 * the same visual grid as the Details form's fields but must stay
 * independent of that form's submit/validation lifecycle. Calls the upload
 * server action directly (a plain async function call, not a form binding),
 * which is what the "+" tap actually triggers: an immediate upload, not
 * something deferred to the top Save button.
 *
 * That direct call is also why `router.refresh()` is required: the action's
 * revalidatePath only invalidates the server cache, and re-renders the route
 * on a FORM submission, not on a plain async call like this one. Without it
 * the upload succeeds while the grid keeps showing the old list.
 */
export default function AddImageTile({ productId }: { productId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const chosen = Array.from(files);

    startTransition(async () => {
      setError(null);

      for (const file of chosen) {
        const isVideo = file.type === "video/mp4";
        const max = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        // Checked here so an oversized pick fails with a sentence instead of
        // a failed request partway through the transfer.
        if (file.size > max) {
          setError(`${file.name}: larger than ${max / (1024 * 1024)}MB.`);
          break;
        }

        // The file goes BROWSER -> SUPABASE directly, never through a server
        // action: Vercel caps a function request body at 4.5MB (413
        // FUNCTION_PAYLOAD_TOO_LARGE) and that ceiling cannot be configured
        // away, so any real video would fail if it were posted to the server.
        // Only the token and, afterwards, the stored path cross that boundary.
        const signed = await createProductUploadUrl(productId, file.type);
        if (!signed.ok) {
          setError(signed.message);
          break;
        }

        const { error: putError } = await getSupabase()
          .storage.from("images")
          .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });

        if (putError) {
          setError(`${file.name}: upload failed (${putError.message}).`);
          break;
        }

        const attached = await attachProductUpload(productId, signed.path, file.name);
        if (!attached.ok) {
          setError(attached.message);
          break;
        }
      }

      router.refresh();
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
          <span className="text-[10px] uppercase tracking-widest">Add media</span>
          <span className="text-[9px] uppercase tracking-widest opacity-70">
            Images or MP4
          </span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,video/mp4"
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
