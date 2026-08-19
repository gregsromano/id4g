import type { Metadata } from "next";

import AdminNav from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: "Fulfillment — ID4G",
  // The dashboard is private; keep it out of search results even though the
  // session cookie already gates it.
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--bg-primary)]">
      <AdminNav />
      <main className="flex-1 px-6 py-10 sm:px-10">{children}</main>
    </div>
  );
}
