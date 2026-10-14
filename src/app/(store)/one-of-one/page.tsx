import type { Metadata } from "next";

import { listActiveProducts } from "@/lib/products";
import { SITE_NAME } from "@/lib/seo";
import ShopCategorySection from "@/components/ShopCategorySection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/one-of-one" },
  title: `One of One Originals — ${SITE_NAME}`,
  description:
    "One of One Originals — unique, hand-made pieces by Greg Romano. No two alike, each one a true original.",
};

export default async function OneOfOnePage() {
  const products = await listActiveProducts("One of One");

  return (
    <main className="flex-1 bg-[var(--bg-primary)]">
      <ShopCategorySection eyebrow="No Two Alike" title="One of One Originals" products={products} />
    </main>
  );
}
