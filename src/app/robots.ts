import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/**
 * robots.txt.
 *
 * There was none, so crawlers had no pointer to a sitemap and nothing
 * discouraged them from indexing the admin and API routes.
 *
 * The disallows are a crawling hint, NOT a security control — `/admin` is
 * protected by the session check in admin-dal.ts, and listing it here only
 * keeps it out of search results. (Listing a path in robots.txt makes it
 * public knowledge, which is fine for `/admin`: the login page gives nothing
 * away, and it is already linked as a known convention.)
 *
 * `/success` is excluded because it is an order confirmation keyed to a
 * Stripe session — it has no standalone value in search results and should
 * not accumulate indexed URLs carrying session ids.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/api/", "/success"],
    },
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
    host: SITE_URL,
  };
}
