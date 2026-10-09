import type { MetadataRoute } from "next";

import { listActiveProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";

/**
 * sitemap.xml, generated from the live catalog.
 *
 * There was no sitemap at all, so every product page relied on being
 * crawled from a homepage link. A generated one means a newly added product
 * is listed the moment it goes active, with no file to remember to edit.
 *
 * `force-dynamic` because the catalog changes: a cached sitemap would keep
 * advertising products that have been archived and omit new ones.
 */
export const dynamic = "force-dynamic";

/** Pages that always exist, with how often they realistically change. */
const STATIC_ROUTES: { path: string; changeFrequency: "daily" | "monthly" | "yearly"; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/sitemap", changeFrequency: "monthly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries = STATIC_ROUTES.map((route) => ({
    url: new URL(route.path, SITE_URL).toString(),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // A sitemap must never take the whole route down: if the catalog read
  // fails, serving the static pages is far better than a 500, which tells a
  // crawler the sitemap is broken.
  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const products = await listActiveProducts();
    productEntries = products.map((product) => ({
      url: new URL(`/products/${product.slug}`, SITE_URL).toString(),
      // The product's own updated_at, so a crawler can tell what actually
      // changed rather than seeing every page touched on every fetch.
      lastModified: new Date(product.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error("[sitemap] failed to list products", error);
  }

  return [...staticEntries, ...productEntries];
}
