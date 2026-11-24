import { NextRequest, NextResponse } from "next/server";
import { getVariantsForCheckout } from "@/lib/products";
import { getSiteSettings } from "@/lib/settings";
import { isPurchasable, isUuid, priceLine } from "@/lib/line-pricing";

type IncomingLine = { productId?: unknown; variantId?: unknown; customNote?: unknown };

/** Same cap /api/checkout applies, so both price the same note the same way. */
const MAX_CUSTOM_NOTE_LENGTH = 300;
const MAX_LINES = 50;

/**
 * Current price and shipping for each line in a shopper's cart. The cart
 * keeps the price from when an item was added, so a sale that started or
 * ended since would otherwise show one price in the drawer and charge another
 * at Stripe. Read-only: it never creates anything, and checkout re-prices
 * from scratch regardless.
 *
 * Lines come back in the order sent; a line that can't be bought any more
 * (unknown, unpublished, or a claimed original) is `null`, left for checkout
 * to reject with its usual message rather than silently dropped here.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const lines: IncomingLine[] = Array.isArray(body?.items) ? body.items.slice(0, MAX_LINES) : [];
  if (lines.length === 0) return NextResponse.json({ prices: [] });

  const variantIds = [...new Set(lines.map((l) => l?.variantId).filter(isUuid))];
  const [variants, { sitewideSale }] = await Promise.all([
    getVariantsForCheckout(variantIds),
    getSiteSettings(),
  ]);
  const byId = new Map(variants.map((v) => [v.variantId, v]));
  const now = Date.now();

  const prices = lines.map((line) => {
    if (!line || !isUuid(line.productId) || !isUuid(line.variantId)) return null;
    const variant = byId.get(line.variantId);
    const customNote =
      typeof line.customNote === "string" ? line.customNote.trim().slice(0, MAX_CUSTOM_NOTE_LENGTH) : "";
    if (!variant || !isPurchasable(variant, line.productId, customNote)) return null;
    return priceLine(variant, customNote, sitewideSale, now);
  });

  return NextResponse.json(
    { prices },
    // Per-shopper and time-sensitive (a sale can start any minute).
    { headers: { "Cache-Control": "no-store" } },
  );
}
