"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import CartButton from "./CartButton";

/**
 * No dedicated Custom Orders page/flow exists yet, so it routes to the one
 * real, already-used channel (see success page's social links) rather than
 * a dead link or a fabricated email address.
 */
const CONTACT_URL = "https://instagram.com/id4gospel";

const NAV_LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: "Home", href: "/" },
  { label: "Drops", href: "/#shop" },
  { label: "Custom Orders", href: CONTACT_URL, external: true },
  { label: "About Greg Romano", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-primary)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="shrink-0" onClick={() => setMenuOpen(false)}>
          <Image
            src="/idfg-logo.webp"
            alt="ID4G — I'll Die For The Gospel"
            width={653}
            height={633}
            className="h-26 w-26"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.label} {...link} />
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <CartButton />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="text-[var(--text-body)] md:hidden"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" />
              <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" />
              <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-4 border-t border-[var(--border)] px-6 py-4 md:hidden">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.label} {...link} onClick={() => setMenuOpen(false)} mobile />
          ))}
        </nav>
      )}
    </header>
  );
}

function NavLink({
  label,
  href,
  external,
  mobile,
  onClick,
}: {
  label: string;
  href: string;
  external?: boolean;
  mobile?: boolean;
  onClick?: () => void;
}) {
  const className = `font-bold uppercase tracking-widest text-[var(--text-body)] transition-colors hover:text-[var(--accent)] ${
    mobile ? "text-base" : "text-sm"
  }`;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={className}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={className}>
      {label}
    </Link>
  );
}
