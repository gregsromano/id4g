import Image from "next/image";
import Link from "next/link";

import { NAV_LINKS } from "@/lib/nav-links";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-primary)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/idfg-logo.webp"
            alt="ID4G — I'll Die For The Gospel"
            width={653}
            height={633}
            className="h-9 w-9"
          />
          <span className="text-sm font-bold uppercase tracking-widest text-[var(--text-body)]">
            I&rsquo;ll Die For The Gospel
          </span>
        </div>

        {/* Mirrors the header nav exactly — same labels, same order, same
            destinations — so the two never drift apart. "Custom Orders" and
            the old footer-only "Instagram" link were already the same URL. */}
        <nav className="flex flex-wrap gap-x-8 gap-y-3">
          {NAV_LINKS.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>

      <div className="border-t border-[var(--border)]">
        <p className="mx-auto max-w-6xl px-6 py-3 text-xs uppercase tracking-wider text-[var(--accent)]">
          &copy; {year} I&rsquo;ll Die For The Gospel. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
