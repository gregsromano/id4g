import MenuVisibilityList from "@/components/admin/MenuVisibilityList";
import { NAV_LINKS } from "@/lib/nav-links";
import { getSiteSettings } from "@/lib/settings";

// Shows the live state of each switch, so it must never be served stale.
export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div>
        <span className="section-label">Storefront</span>
        <h1 className="!text-4xl mt-1 text-[var(--text-primary)]">Menu</h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--text-muted)]">
          Switch a menu item off to remove it from the site&rsquo;s header, the
          phone menu and the footer. The page itself still works if someone
          has the link — it just isn&rsquo;t in the menu.
        </p>
      </div>

      <MenuVisibilityList
        items={NAV_LINKS.map((link) => ({
          id: link.id,
          label: link.label,
          href: link.href,
          children: (link.children ?? []).map(({ id, label, href }) => ({ id, label, href })),
        }))}
        hidden={settings.hiddenNavItems}
      />
    </div>
  );
}
