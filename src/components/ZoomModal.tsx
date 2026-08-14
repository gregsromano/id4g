"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type ZoomModalProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  onClose: () => void;
};

const MAX_ZOOM = 4;

export default function ZoomModal({
  src,
  alt,
  width,
  height,
  onClose,
}: ZoomModalProps) {
  const [zoomed, setZoomed] = useState(false);
  // Origin the image scales from, as a percentage of the frame.
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const frameRef = useRef<HTMLDivElement>(null);

  // Close on Escape, and lock background scroll while open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const moveOrigin = useCallback((clientX: number, clientY: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const r = frame.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * 100;
    const y = ((clientY - r.top) / r.height) * 100;
    setOrigin({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    });
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[100] flex flex-col bg-[#050505]"
      onClick={onClose}
    >
      {/* Bar */}
      <div className="flex items-center justify-between px-5 py-4 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
          {zoomed ? "Drag to explore" : "Tap image to zoom"}
        </p>
        <button
          onClick={onClose}
          aria-label="Close"
          className="text-2xl leading-none text-white transition-opacity hover:opacity-60"
        >
          &times;
        </button>
      </div>

      {/* Image frame */}
      <div
        ref={frameRef}
        className="relative flex-1 overflow-hidden"
        onClick={(e) => {
          // Keep clicks inside the frame from closing the modal.
          e.stopPropagation();
          moveOrigin(e.clientX, e.clientY);
          setZoomed((z) => !z);
        }}
        onMouseMove={(e) => {
          if (zoomed) moveOrigin(e.clientX, e.clientY);
        }}
        onTouchMove={(e) => {
          if (!zoomed) return;
          const t = e.touches[0];
          if (t) moveOrigin(t.clientX, t.clientY);
        }}
        style={{ cursor: zoomed ? "zoom-out" : "zoom-in" }}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority
          quality={90}
          // The image is scaled up to MAX_ZOOM in place, so ask for a source
          // several times wider than the frame or the zoom reveals compression.
          sizes="(max-width: 640px) 200vw, 300vw"
          draggable={false}
          className="h-full w-full select-none object-contain transition-transform duration-300 ease-out"
          style={{
            transform: `scale(${zoomed ? MAX_ZOOM : 1})`,
            transformOrigin: `${origin.x}% ${origin.y}%`,
          }}
        />
      </div>

      {/* Footer hint */}
      <div className="px-5 py-4 text-center sm:px-8">
        <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
          Hand finished &middot; No two alike
        </p>
      </div>
    </div>
  );
}
