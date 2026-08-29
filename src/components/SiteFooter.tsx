import Image from "next/image";
import Link from "next/link";

import { CONTACT_URL, NAV_LINKS } from "@/lib/nav-links";

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
            destinations — so the two never drift apart. The Instagram link
            below is deliberately NOT in here: it is a social link, which
            belongs beside the copyright rather than in site navigation. */}
        <nav className="flex flex-wrap gap-x-8 gap-y-3">
          {NAV_LINKS.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>

      <div className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
          <p className="text-sm uppercase tracking-wider text-[var(--accent)]">
            &copy; {year} I&rsquo;ll Die For The Gospel. All rights reserved.
          </p>

          {/* Social, not navigation — hence its own row rather than the nav
              above. Same destination as "Custom Orders", but people look for
              a brand's Instagram by name, and a footer without one reads as
              missing. */}
          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ID4G on Instagram"
            className="flex min-h-11 items-center gap-2 text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)] sm:min-h-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="17.6" cy="6.4" r="1.3" fill="currentColor" />
            </svg>
            Instagram
          </a>
        </div>
      </div>
    </footer>
  );
}
