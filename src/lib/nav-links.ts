/**
 * The site's primary navigation, shared by the header and the footer.
 *
 * Defined once because the two had drifted: the footer was missing Home,
 * Shop and Contact, and carried a duplicate "Shop" and an "Instagram" that the header
 * did not have — even though "Instagram" pointed at the same URL as the
 * header's "Custom Orders". A single list is what stops that happening again.
 */

export const CONTACT_URL = "https://instagram.com/id4gospel";

export type NavLinkItem = {
  /**
   * Stable key the admin's hide/show switches are stored under. Never change
   * an existing id: a hidden item would quietly reappear on the live site.
   */
  id: string;
  label: string;
  href: string;
  external?: boolean;
  /** Category sub-links shown as a dropdown under this item (desktop hover, expanded inline on mobile). */
  children?: NavChildItem[];
};

export type NavChildItem = { id: string; label: string; href: string };

export const NAV_LINKS: NavLinkItem[] = [
  { id: "home", label: "Home", href: "/" },
  {
    id: "shop",
    label: "Shop",
    href: "/#shop",
    children: [
      { id: "shop-hoodies", label: "Hoodies", href: "/shop/hoodies" },
      { id: "shop-tees", label: "Tees", href: "/shop/tees" },
      { id: "shop-hats", label: "Hats", href: "/shop/hats" },
      { id: "shop-one-of-one", label: "1 of 1", href: "/one-of-one" },
    ],
  },
  { id: "one-of-one", label: "1 of 1", href: "/one-of-one" },
  { id: "custom-orders", label: "Custom Orders", href: CONTACT_URL, external: true },
  { id: "about", label: "About Greg Romano", href: "/about" },
  { id: "contact", label: "Contact", href: "/contact" },
];

/** Every id the admin can hide — top-level items and dropdown sub-links. */
export const NAV_ITEM_IDS: string[] = NAV_LINKS.flatMap((link) => [
  link.id,
  ...(link.children ?? []).map((child) => child.id),
]);

/**
 * NAV_LINKS minus whatever the admin switched off in /admin/menu. Hiding a
 * top-level item takes its dropdown with it; hiding every sub-link leaves the
 * parent as a plain link with no dropdown.
 */
export function visibleNavLinks(hiddenIds: string[]): NavLinkItem[] {
  const hidden = new Set(hiddenIds);
  return NAV_LINKS.filter((link) => !hidden.has(link.id)).map((link) =>
    link.children
      ? { ...link, children: link.children.filter((child) => !hidden.has(child.id)) }
      : link,
  );
}

/**
 * The footer's site map, grouped by section.
 *
 * Reuses NAV_LINKS entries rather than retyping labels/hrefs, so the two
 * can't drift. Privacy Policy is added only here — it's deliberately left
 * out of NAV_LINKS (it doesn't belong beside Shop and Contact in the header)
 * but a site map should still list every reachable page. Items hidden in
 * /admin/menu drop out here too, and an emptied section drops out entirely.
 */
export type SiteMapSection = { heading: string; links: NavLinkItem[] };

export function siteMapSections(hiddenIds: string[]): SiteMapSection[] {
  const links = visibleNavLinks(hiddenIds);
  const byId = (ids: string[]) => links.filter((link) => ids.includes(link.id));

  return [
    { heading: "Shop", links: byId(["home", "shop", "one-of-one"]) },
    { heading: "Company", links: byId(["about", "contact", "custom-orders"]) },
    { heading: "Legal", links: [{ id: "privacy", label: "Privacy Policy", href: "/privacy" }] },
  ].filter((section) => section.links.length > 0);
}
