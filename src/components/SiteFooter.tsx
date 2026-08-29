import Image from "next/image";
import Link from "next/link";

const CONTACT_URL = "https://instagram.com/id4gospel";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-primary)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-start sm:justify-between">
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

        <nav className="flex flex-wrap gap-x-8 gap-y-3">
          <Link
            href="/#shop"
            className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
          >
            Shop
          </Link>
          <Link
            href="/about"
            className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
          >
            About Greg
          </Link>
          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
          >
            Instagram
          </a>
        </nav>
      </div>

      <div className="border-t border-[var(--border)]">
        <p className="mx-auto max-w-6xl px-6 py-6 text-sm uppercase tracking-wider text-[var(--accent)]">
          &copy; {year} I&rsquo;ll Die For The Gospel. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
