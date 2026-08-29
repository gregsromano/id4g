/**
 * The site's primary navigation, shared by the header and the footer.
 *
 * Defined once because the two had drifted: the footer was missing Home,
 * Drops and Contact, and carried a "Shop" and an "Instagram" that the header
 * did not have — even though "Instagram" pointed at the same URL as the
 * header's "Custom Orders". A single list is what stops that happening again.
 */

export const CONTACT_URL = "https://instagram.com/id4gospel";

export type NavLinkItem = { label: string; href: string; external?: boolean };

export const NAV_LINKS: NavLinkItem[] = [
  { label: "Home", href: "/" },
  { label: "Drops", href: "/#shop" },
  { label: "Custom Orders", href: CONTACT_URL, external: true },
  { label: "About Greg Romano", href: "/about" },
  { label: "Contact", href: "/contact" },
];
