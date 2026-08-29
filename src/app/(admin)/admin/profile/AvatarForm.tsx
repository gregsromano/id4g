"use client";

import { useActionState, useRef, useState } from "react";

import Avatar from "@/components/admin/Avatar";

import { removeAvatarAction, uploadAvatarAction, type ProfileActionResult } from "./actions";

/**
 * Profile photo: the current picture, a file picker, and a remove button.
 *
 * The chosen file previews locally (via an object URL) before it is uploaded,
 * so picking the wrong image is obvious immediately rather than after a
 * round trip. The preview is only ever a local echo — the server still
 * validates type and size, and the row is what decides what everyone sees.
 */
export default function AvatarForm({
  avatarUrl,
  email,
}: {
  avatarUrl: string | null;
  email: string;
}) {
  const [state, action, pending] = useActionState<ProfileActionResult | null, FormData>(
    uploadAvatarAction,
    null,
  );
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-5">
        <Avatar src={preview ?? avatarUrl} email={email} size={80} />

        <form action={action} className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer border border-[var(--border)] px-4 py-2 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
            Choose photo
            <input
              ref={inputRef}
              type="file"
              name="avatar"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleChange}
              className="hidden"
            />
          </label>

          <button type="submit" disabled={pending || !preview} className="btn-primary disabled:opacity-40">
            {pending ? "Uploading..." : "Save photo"}
          </button>
        </form>
      </div>

      {state && "error" in state && <p className="mt-4 text-sm text-red-400">{state.error}</p>}
      {state && "ok" in state && (
        <p className="mt-4 text-sm text-[var(--accent)]">Photo updated.</p>
      )}

      <p className="mt-4 text-xs text-[var(--text-muted)]">
        PNG, JPEG, or WEBP, up to 4MB. Square images look best — the photo is
        cropped to a circle.
      </p>

      {avatarUrl && (
        <form action={removeAvatarAction} className="mt-4">
          <button
            type="submit"
            className="border border-[var(--border)] px-4 py-2 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:border-red-400 hover:text-red-400"
          >
            Remove photo
          </button>
        </form>
      )}
    </div>
  );
}
