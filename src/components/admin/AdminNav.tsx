"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import Avatar from "./Avatar";

const LINKS = [
  { href: "/admin", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/lifestyle", label: "Lifestyle" },
  { href: "/admin/import", label: "Import tracking" },
  { href: "/admin/profile", label: "Profile" },
];

export default function AdminNav({
  email,
  avatarUrl,
}: {
  email: string | null;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // The login page renders inside this layout but has no session to end.
  if (pathname === "/admin/login") return null;

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-5 sm:px-10">
      <div className="flex flex-wrap items-center gap-6 sm:gap-10">
        <span className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">
          ID4G Fulfillment
        </span>
        <nav className="flex flex-wrap items-center gap-5 sm:gap-8">
          {LINKS.map((link) => {
            const active =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm uppercase tracking-widest transition-colors ${
                  active
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--accent)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-5">
        {/* Opens the public storefront in a new tab so the dashboard — and any
            unsaved work on it — stays put. */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 border border-[var(--border)] px-4 py-2 text-sm uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
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

        <Link href="/admin/profile" aria-label="Profile" className="shrink-0">
          <Avatar
            src={avatarUrl}
            email={email ?? ""}
            size={40}
            className="transition-colors hover:border-[var(--accent)]"
          />
        </Link>

        <button
          onClick={handleLogout}
          className="text-sm uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
