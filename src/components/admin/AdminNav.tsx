"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import Avatar from "./Avatar";

const LINKS = [
  { href: "/admin", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/lifestyle", label: "Lifestyle" },
  { href: "/admin/discounts", label: "Discounts" },
  { href: "/admin/import", label: "Import tracking" },
  { href: "/admin/profile", label: "Profile" },
];

/**
 * Admin header.
 *
 * On phones the links wrapped to one line each and ate ~200px before any
 * content, on every page. Below `xl` they collapse behind a menu button; the
 * profile photo and Log out stay on the bar, since those are the two things
 * worth reaching without opening anything.
 *
 * The breakpoint is `xl` (1280px), not `sm`: six links plus the wordmark,
 * Live site, avatar and Log out need ~1112px of bar, so anything narrower
 * scrolled horizontally rather than wrapping. It already overflowed at 900px
 * with five links; adding Discounts pushed that to 1024. Measured across
 * 390–1440px, `xl` is the first breakpoint where the full row genuinely fits.
 *
 * Tap targets are min-h-11 (44px) on mobile — the links were 20px tall, well
 * under the usual touch guideline — and relax back to the tighter desktop
 * sizing at `xl`, where they are mouse targets rather than thumb targets.
 */
export default function AdminNav({
  email,
  avatarUrl,
}: {
  email: string | null;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // The login page renders inside this layout but has no session to end.
  if (pathname === "/admin/login") return null;

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  function isActive(href: string) {
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  return (
    <header className="no-print border-b border-[var(--border)]">
      <div className="flex items-center justify-between gap-4 px-6 py-3 sm:px-10 sm:py-5">
        <div className="flex items-center gap-4 sm:gap-10">
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-[var(--border)] text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] xl:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              {menuOpen ? (
                <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>

          <span className="whitespace-nowrap text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">
            ID4G <span className="hidden xl:inline">Fulfillment</span>
          </span>

          <nav className="hidden items-center gap-6 xl:flex xl:gap-8">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap text-sm uppercase tracking-widest transition-colors ${
                  isActive(link.href)
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--accent)]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          {/* Opens the public storefront in a new tab so the dashboard — and any
              unsaved work on it — stays put. Hidden on phones, where it is in
              the menu instead and the bar has no room. */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden shrink-0 items-center gap-2 whitespace-nowrap border border-[var(--border)] px-4 py-2 text-sm uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] xl:flex"
          >
            Live site
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M4.5 1.5H10.5V7.5M10.5 1.5L5 7M9 7.5v3H1.5V3h3"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>

          <Link href="/admin/profile" aria-label="Profile" className="flex h-11 w-11 shrink-0 items-center justify-center xl:h-auto xl:w-auto">
            <Avatar
              src={avatarUrl}
              email={email ?? ""}
              size={40}
              className="transition-colors hover:border-[var(--accent)]"
            />
          </Link>

          <button
            onClick={handleLogout}
            className="flex min-h-11 items-center text-sm uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)] xl:min-h-0"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Mobile menu. Rendered only when open so the closed bar stays one row. */}
      {menuOpen && (
        <nav className="border-t border-[var(--border)] xl:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`flex min-h-12 items-center border-b border-[var(--border)] px-6 text-sm uppercase tracking-widest transition-colors ${
                isActive(link.href)
                  ? "bg-[var(--bg-section-alt)] text-[var(--accent)]"
                  : "text-[var(--text-muted)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center gap-2 px-6 text-sm uppercase tracking-widest text-[var(--text-muted)]"
          >
            Live site
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M4.5 1.5H10.5V7.5M10.5 1.5L5 7M9 7.5v3H1.5V3h3"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </nav>
      )}
    </header>
  );
}
