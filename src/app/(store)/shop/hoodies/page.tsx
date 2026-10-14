import type { Metadata } from "next";

import { listActiveProducts } from "@/lib/products";
import { SITE_NAME } from "@/lib/seo";
import ShopCategorySection from "@/components/ShopCategorySection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/shop/hoodies" },
  title: `Hoodies — ${SITE_NAME}`,
  description:
    "Hand-made, one-of-a-kind hoodies by Greg Romano — faith streetwear, no two alike.",
};

export default async function HoodiesPage() {
  const products = await listActiveProducts("Hoodie");

  return (
    <main className="flex-1 bg-[var(--bg-primary)]">
      <ShopCategorySection eyebrow="The Drop" title="Hoodies" products={products} />
    </main>
  );
}
