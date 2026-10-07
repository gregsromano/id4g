import type { Metadata } from "next";

import { SITE_NAME } from "@/lib/seo";

/**
 * Metadata holder for /contact.
 *
 * The page itself is a client component (it has form state), and client
 * components cannot export `metadata` — so the title and canonical live in a
 * layout wrapping it. Without this the page inherited the site-wide homepage
 * title, which said nothing about contacting anyone.
 */
export const metadata: Metadata = {
  title: `Contact — ${SITE_NAME}`,
  description:
    "Get in touch with Greg Romano about custom orders, sizing, or an existing order from I'm Down For The Gospel.",
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
