import Image from "next/image";

/**
 * Circular profile photo, Instagram-style.
 *
 * Falls back to the first letter of the email when no photo is set — an
 * account without one is the normal starting state, not an error, so it
 * should still render something deliberate rather than a broken image.
 *
 * A plain <img>-backed next/image with `unoptimized` is used because avatars
 * are small, already cropped by the browser to a circle, and change rarely;
 * running them through the optimizer buys nothing at this size.
 */
export default function Avatar({
  src,
  email,
  size = 36,
  className = "",
}: {
  src: string | null;
  email: string;
  size?: number;
  className?: string;
}) {
  const initial = email.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg-section-alt)] ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={size * 2}
          height={size * 2}
          unoptimized
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="font-semibold uppercase leading-none text-[var(--text-muted)]"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {initial}
        </span>
      )}
    </span>
  );
}
