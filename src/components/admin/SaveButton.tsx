"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { useDirty } from "./UnsavedChangesForm";

/**
 * Submit button for a Server Action form: spinner + "Saving..." while
 * pending, "Saved" for a couple seconds after it completes, then back to
 * "Save". Must render inside the <form> it submits — useFormStatus() reads
 * pending state from the nearest form ancestor in the React tree.
 *
 * When the surrounding form has other buttons that override the submission
 * with their own `formAction` (e.g. per-image "Remove"/"Set as cover"),
 * pass this button's own `action` so it only reports pending/success for
 * ITS submission — otherwise clicking an unrelated button would flash
 * "Saved" even though this action never ran, and would wrongly clear the
 * unsaved-changes flag for edits that button didn't persist.
 */
export default function SaveButton({
  className,
  action,
}: {
  className?: string;
  action?: (formData: FormData) => void | Promise<void>;
}) {
  const status = useFormStatus();
  const dirtyCtx = useDirty();
  const [justSaved, setJustSaved] = useState(false);
  const wasPending = useRef(false);

  const isMine = action === undefined || status.action === action;
  const pending = status.pending && isMine;

  useEffect(() => {
    if (wasPending.current && !pending) {
      setJustSaved(true);
      dirtyCtx?.setDirty(false);
      const timer = setTimeout(() => setJustSaved(false), 2000);
      return () => clearTimeout(timer);
    }
    wasPending.current = pending;
  }, [pending, dirtyCtx]);

  return (
    <button
      type="submit"
      disabled={status.pending}
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
