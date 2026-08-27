"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Submit button for a Server Action form: spinner + "Saving..." while
 * pending, "Saved" for a couple seconds after it completes, then back to
 * "Save". Must render inside the <form> it submits — useFormStatus() reads
 * pending state from the nearest form ancestor in the React tree.
 */
export default function SaveButton({ className }: { className?: string }) {
  const { pending } = useFormStatus();
  const [justSaved, setJustSaved] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending) {
      setJustSaved(true);
      const timer = setTimeout(() => setJustSaved(false), 2000);
      return () => clearTimeout(timer);
    }
    wasPending.current = pending;
  }, [pending]);

  return (
    <button
      type="submit"
      disabled={pending}
      className={className ?? "btn-primary !py-2 !px-6"}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Spinner />
          Saving...
        </span>
      ) : justSaved ? (
        "Saved"
      ) : (
        "Save"
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
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
