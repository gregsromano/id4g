/** Overlay for a claimed one-of-one: the original is gone, but a custom version can still be ordered. */
export default function SoldOverlay({ size = "lg" }: { size?: "sm" | "lg" }) {
  const lg = size === "lg";
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 px-4 text-center">
      <span
        className={`border-2 border-white font-[family-name:var(--font-block)] uppercase tracking-widest text-white ${
          lg ? "px-6 py-2 text-2xl sm:text-3xl" : "px-4 py-1.5 text-lg"
        }`}
      >
        Sold Out
      </span>
      <div className={`rounded-md border border-white/15 bg-black/70 ${lg ? "px-5 py-3" : "px-3 py-2"}`}>
        <p
          className={`font-[family-name:var(--font-block)] uppercase tracking-widest text-[var(--accent)] ${
            lg ? "text-xl sm:text-2xl" : "text-base"
          }`}
        >
          Custom Version Available
        </p>
        <p className={`mt-1 text-white ${lg ? "text-sm sm:text-base" : "text-xs"}`}>
          Order yours—each piece is handmade and unique.
        </p>
      </div>
    </div>
  );
}
