import type { Metadata } from "next";

import { listActiveProducts } from "@/lib/products";
import { SITE_NAME } from "@/lib/seo";
import ShopCategorySection from "@/components/ShopCategorySection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/shop/hats" },
  title: `Hats — ${SITE_NAME}`,
  description:
    "Hand-made, one-of-a-kind hats by Greg Romano — faith streetwear, no two alike.",
};

export default async function HatsPage() {
  const products = await listActiveProducts("Hat");

  return (
    <main className="flex-1 bg-[var(--bg-primary)]">
      <ShopCategorySection eyebrow="The Drop" title="Hats" products={products} />
    </main>
  );
}
