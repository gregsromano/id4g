/**
 * The site's primary navigation, shared by the header and the footer.
 *
 * Defined once because the two had drifted: the footer was missing Home,
 * Shop and Contact, and carried a duplicate "Shop" and an "Instagram" that the header
 * did not have — even though "Instagram" pointed at the same URL as the
 * header's "Custom Orders". A single list is what stops that happening again.
 */

export const CONTACT_URL = "https://instagram.com/id4gospel";

export type NavLinkItem = { label: string; href: string; external?: boolean };

export const NAV_LINKS: NavLinkItem[] = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/#shop" },
  { label: "Custom Orders", href: CONTACT_URL, external: true },
  { label: "About Greg Romano", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/**
 * The footer's site map, grouped by section.
 *
 * Reuses NAV_LINKS entries rather than retyping labels/hrefs, so the two
 * can't drift. Privacy Policy is added only here — it's deliberately left
 * out of NAV_LINKS (it doesn't belong beside Shop and Contact in the header)
 * but a site map should still list every reachable page.
 */
const byLabel = (labels: string[]) =>
  NAV_LINKS.filter((link) => labels.includes(link.label));

export const SITE_MAP_SECTIONS: { heading: string; links: NavLinkItem[] }[] = [
  { heading: "Shop", links: byLabel(["Home", "Shop"]) },
  { heading: "Company", links: byLabel(["About Greg Romano", "Contact", "Custom Orders"]) },
  { heading: "Legal", links: [{ label: "Privacy Policy", href: "/privacy" }] },
];
