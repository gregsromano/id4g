import Image from "next/image";
import Link from "next/link";

import { SITE_MAP_SECTIONS } from "@/lib/nav-links";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-primary)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 sm:flex-row sm:justify-between sm:gap-16 sm:py-12">
        <div className="flex items-center gap-3">
          <Image
            src="/idfg-logo.webp"
            alt="ID4G — I'm Down For The Gospel"
            width={640}
            height={620}
            className="h-9 w-9"
          />
          <span className="text-sm font-bold uppercase tracking-widest text-[var(--text-body)]">
            I&rsquo;m Down For The Gospel
          </span>
        </div>

        {/* Every reachable page, grouped and labeled — a human-readable
            counterpart to sitemap.xml (src/app/sitemap.ts), which crawlers
            read but no visitor ever sees. */}
        <nav aria-label="Site map">
          <Link href="/sitemap" className="section-label mb-4 hover:text-[var(--accent)]">
            Site Map
          </Link>
          <div className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-3">
            {SITE_MAP_SECTIONS.map((section) => (
              <div key={section.heading}>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--text-body)]">
                  {section.heading}
                </h2>
                <ul className="flex flex-col gap-2">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      </div>

      <div className="border-t border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-3">
          <p className="text-xs uppercase tracking-wider text-[var(--accent)]">
            &copy; {year} I&rsquo;m Down For The Gospel. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
