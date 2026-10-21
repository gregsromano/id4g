"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import CartButton from "./CartButton";
import type { NavLinkItem } from "@/lib/nav-links";

/**
 * No dedicated Custom Orders page/flow exists yet, so it routes to the one
 * real, already-used channel (see success page's social links) rather than
 * a dead link or a fabricated email address.
 */


export default function SiteHeader({ links }: { links: NavLinkItem[] }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-primary)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="shrink-0" onClick={() => setMenuOpen(false)}>
          <Image
            src="/idfg-logo.webp"
            alt="ID4G — I'm Down For The Gospel"
            width={640}
            height={620}
            className="h-26 w-26"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
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
          {links.map((link) => (
            <div key={link.label}>
              <NavLink {...link} onClick={() => setMenuOpen(false)} mobile />
              {link.children && link.children.length > 0 && (
                <div className="ml-4 mt-3 flex flex-col gap-3">
                  {link.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMenuOpen(false)}
                      className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
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
  children,
}: {
  label: string;
  href: string;
  external?: boolean;
  mobile?: boolean;
  onClick?: () => void;
  children?: { label: string; href: string }[];
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

  // Desktop only: a hover dropdown for items with category sub-links (e.g.
  // Shop -> Hoodies/Tees/Hats). Mobile renders children as its own indented
  // list right in the slide-down menu instead, since there's no hover there.
  if (!mobile && children && children.length > 0) {
    return (
      <div className="group relative py-2">
        <Link href={href} onClick={onClick} className={className}>
          {label}
        </Link>
        <div className="invisible absolute left-0 top-full z-50 flex min-w-[160px] flex-col gap-3 border border-[var(--border)] bg-[var(--bg-primary)] p-4 opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
          {children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={onClick}
              className="text-sm font-bold uppercase tracking-widest text-[var(--text-body)] transition-colors hover:text-[var(--accent)]"
            >
              {child.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={className}>
      {label}
    </Link>
  );
}
