"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";

/**
 * Tracks whether any field inside the wrapped form has been edited since the
 * last successful save, so a Save button (via SaveButton's dirty reset) and
 * a navigation guard (GuardedLink) can both react to it. `null` outside the
 * provider so consumers can render fine when not wrapped by this form.
 */
export const DirtyContext = createContext<{
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
} | null>(null);

export function useDirty() {
  return useContext(DirtyContext);
}

export default function UnsavedChangesForm({
  action,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  children: React.ReactNode;
}) {
  const [dirty, setDirty] = useState(false);

  // Covers closing the tab, refreshing, or navigating to a new URL — the one
  // case a client-side Link guard can't catch, since the browser (not React)
  // owns that transition.
  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      // Chrome requires returnValue to be set; the string itself is ignored
      // by every modern browser in favor of a generic built-in message.
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  return (
    <DirtyContext.Provider value={{ dirty, setDirty }}>
      {/* A native `change` event on any descendant field bubbles up to this
          handler, so one listener covers every input/textarea in the form
          without wiring each field individually. */}
      <form action={action} className={className} onChange={() => setDirty(true)}>
        {children}
      </form>
    </DirtyContext.Provider>
  );
}

/** A Link that confirms before leaving if the surrounding form is dirty. */
export function GuardedLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const dirtyCtx = useDirty();

  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        if (
          dirtyCtx?.dirty &&
          !window.confirm("You have unsaved changes. Leave without saving?")
        ) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </Link>
  );
}
