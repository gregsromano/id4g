"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import {
  attachVideoPosterAction,
  clearVideoPosterAction,
  createProductUploadUrl,
} from "@/app/(admin)/admin/products/actions";
import { getSupabase } from "@/lib/supabase";

const MAX_POSTER_BYTES = 8 * 1024 * 1024;

/**
 * Lets the admin give one video entry a static poster instead of relying on
 * a browser's own (inconsistent — often a black frame) first-frame guess:
 * scrub the video and grab a frame, or upload a separate image. Either path
 * reuses the same signed-URL upload as AddImageTile, then attaches the
 * result to this specific video's `posterUrl` rather than adding a new
 * gallery item.
 */
export default function VideoPosterPicker({
  productId,
  videoUrl,
  posterUrl,
}: {
  productId: string;
  videoUrl: string;
  posterUrl: string | null | undefined;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadPoster(file: Blob, contentType: string) {
    setError(null);
    if (file.size > MAX_POSTER_BYTES) {
      setError(`Image larger than ${MAX_POSTER_BYTES / (1024 * 1024)}MB.`);
      return;
    }

    const signed = await createProductUploadUrl(productId, contentType);
    if (!signed.ok) {
      setError(signed.message);
      return;
    }

    const { error: putError } = await getSupabase()
      .storage.from("images")
      .uploadToSignedUrl(signed.path, signed.token, file, { contentType });
    if (putError) {
      setError(`Upload failed (${putError.message}).`);
      return;
    }

    const attached = await attachVideoPosterAction(productId, videoUrl, signed.path);
    if (!attached.ok) {
      setError(attached.message);
      return;
    }

    router.refresh();
    setOpen(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    startTransition(async () => {
      await uploadPoster(file, file.type);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    startTransition(async () => {
      // Pulling a frame onto a canvas from a cross-origin source (the video
      // lives on Supabase Storage, a different origin than the admin page)
      // taints the canvas unless the element opted into CORS up front via
      // `crossOrigin` — and reading a tainted canvas throws a SecurityError
      // the moment toBlob() is called. Caught here rather than left to
      // crash: with no error.tsx anywhere in this app, an uncaught client
      // exception doesn't just fail this dialog, it blanks the entire page.
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setError("Could not capture that frame.");
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob: Blob | null = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.9),
        );
        if (!blob) {
          setError("Could not capture that frame.");
          return;
        }
        await uploadPoster(blob, "image/jpeg");
      } catch {
        setError("Could not capture that frame — try uploading an image instead.");
      }
    });
  }

  function handleClear() {
    startTransition(async () => {
      await clearVideoPosterAction(productId, videoUrl);
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="mt-2 w-full border border-[var(--border)] py-1 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        {posterUrl ? "Change thumbnail" : "Add thumbnail"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose video thumbnail"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg border border-[var(--border)] bg-[var(--bg-primary)] p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">
                Video thumbnail
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-2xl leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                &times;
              </button>
            </div>

            {posterUrl && (
              <div className="mb-4 flex items-center gap-3">
                <Image
                  src={posterUrl}
                  alt="Current thumbnail"
                  width={64}
                  height={64}
                  className="h-16 w-16 border border-[var(--border)] object-cover"
                />
                <span className="text-xs text-[var(--text-muted)]">Current thumbnail</span>
              </div>
            )}

            <p className="mb-2 text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Pick a frame
            </p>
            <video
              ref={videoRef}
              src={videoUrl}
              // Required for canvas capture: the video is served from
              // Supabase Storage, a different origin than this admin page,
              // and without this the canvas we draw it onto is "tainted" —
              // readable on screen but unreadable by toBlob(), which is
              // exactly the capture step below needs to do.
              crossOrigin="anonymous"
              muted
              playsInline
              preload="metadata"
              onLoadedMetadata={() => setReady(true)}
              className="mb-2 w-full border border-[var(--border)]"
            />
            <input
              type="range"
              min={0}
              max={1000}
              defaultValue={0}
              disabled={!ready}
              onChange={(e) => {
                const video = videoRef.current;
                if (!video || !video.duration) return;
                video.currentTime = (Number(e.target.value) / 1000) * video.duration;
              }}
              className="mb-3 w-full"
            />
            {/* Off-screen, not display:none — Safari skips decoding frames
                for a canvas-less draw target in some versions, so this stays
                a real (just visually hidden) element. */}
            <canvas ref={canvasRef} className="hidden" />
            <button
              type="button"
              disabled={!ready || isPending}
              onClick={captureFrame}
              className="mb-4 w-full border border-[var(--border)] py-2 text-xs uppercase tracking-widest text-[var(--text-body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
            >
              Use this frame
            </button>

            <p className="mb-2 text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Or upload an image
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={isPending}
              onChange={handleFileChange}
              className="mb-4 w-full text-xs text-[var(--text-muted)]"
            />

            {posterUrl && (
              <button
                type="button"
                disabled={isPending}
                onClick={handleClear}
                className="w-full border border-[var(--border)] py-1 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:border-red-400 hover:text-red-400"
              >
                Remove thumbnail
              </button>
            )}

            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            {isPending && <p className="mt-3 text-xs text-[var(--text-muted)]">Saving…</p>}
          </div>
        </div>
      )}
    </>
  );
}
