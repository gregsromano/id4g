"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/import", label: "Import tracking" },
];

export default function AdminNav() {
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
    <header className="no-print flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[var(--border)] px-6 py-4 sm:px-10">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:gap-8">
        <span className="section-label">ID4G Fulfillment</span>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:gap-6">
          {LINKS.map((link) => {
            const active =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs uppercase tracking-widest transition-colors ${
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

      <button
        onClick={handleLogout}
        className="text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
      >
        Log out
      </button>
    </header>
  );
}
