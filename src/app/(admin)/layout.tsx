import type { Metadata } from "next";

import AdminNav from "@/components/admin/AdminNav";
import { getAdminUserOrNull } from "@/lib/admin-dal";

export const metadata: Metadata = {
  title: "Fulfillment — ID4G",
  // The dashboard is private; keep it out of search results even though the
  // session cookie already gates it.
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Display only — never an authorization result. Null on the login page,
  // which renders inside this layout with no session; every page and action
  // still gates on requireAdmin/requireAdminUser.
  const user = await getAdminUserOrNull();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--bg-primary)]">
      <AdminNav email={user?.email ?? null} avatarUrl={user?.avatarUrl ?? null} />
      <main className="flex-1 px-6 py-10 sm:px-10">{children}</main>
    </div>
  );
}
