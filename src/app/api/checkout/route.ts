import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { PRODUCT, type Size } from "@/lib/product";

type IncomingItem = { productId: string; size: string; quantity: number };

/**
 * Validate + normalize the cart the client sent. Prices are looked up
 * server-side from PRODUCT — never trusted from the request body.
 */
function normalize(items: unknown): { size: Size; quantity: number }[] | null {
  if (!Array.isArray(items) || items.length === 0) return null;

  const merged = new Map<Size, number>();
  for (const raw of items as IncomingItem[]) {
    if (!raw || raw.productId !== PRODUCT.id) return null;
    if (!PRODUCT.sizes.includes(raw.size as Size)) return null;
    const qty = Number(raw.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return null;
    const size = raw.size as Size;
    merged.set(size, (merged.get(size) ?? 0) + qty);
  }
  return [...merged.entries()].map(([size, quantity]) => ({ size, quantity }));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const normalized = normalize(body?.items);

  if (!normalized) {
    return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
  }

  // tax_behavior "exclusive" = tax is added on top of the listed price.
  const line_items = normalized.map(({ size, quantity }) => ({
    price_data: {
      currency: PRODUCT.currency,
      unit_amount: PRODUCT.priceCents,
      tax_behavior: "exclusive" as const,
      product_data: {
        name: PRODUCT.name,
        description: `Size: ${size}`,
        // Apparel tax category so Stripe Tax rates it correctly per state.
        tax_code: "txcd_30011000", // General - Clothing
      },
    },
    quantity,
  }));

  // One flat shipping charge for the order.
  line_items.push({
    price_data: {
      currency: PRODUCT.currency,
      unit_amount: PRODUCT.shippingCents,
      tax_behavior: "exclusive" as const,
      product_data: {
        name: "Shipping",
        description: "Flat-rate shipping",
        tax_code: "txcd_92010001", // Shipping
      },
    },
    quantity: 1,
  });

  // Compact summary stored on the session for the webhook + confirmation page.
  const itemsSummary = normalized
    .map(({ size, quantity }) => `${size} x${quantity}`)
    .join(", ");

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    // Stripe Tax computes sales tax from the shipping address, and only
    // charges in states where you've added a tax registration.
    automatic_tax: { enabled: true },
    shipping_address_collection: {
      allowed_countries: ["US"],
    },
    line_items,
    metadata: {
      items: JSON.stringify(normalized),
      items_summary: itemsSummary,
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/`,
  });

  return NextResponse.json({ url: session.url });
}
