import type { Metadata } from "next";

import { SITE_NAME } from "@/lib/seo";

/**
 * Metadata holder for /success — the page is a client component and cannot
 * export `metadata` itself.
 *
 * `noindex` deliberately: this is an order confirmation keyed to a Stripe
 * session id. It has no value in search results, and indexing it would put
 * URLs carrying session ids into Google's index. robots.txt also disallows
 * the path, but that only asks crawlers not to FETCH it — a page linked from
 * elsewhere can still be indexed from the link alone, and only this header
 * actually keeps it out of results.
 */
export const metadata: Metadata = {
  title: `Order confirmed — ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default function SuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
