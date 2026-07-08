import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { PRODUCT } from "@/lib/product";

export async function POST(req: NextRequest) {
  const { size } = await req.json();

  if (!PRODUCT.sizes.includes(size)) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    shipping_address_collection: {
      allowed_countries: ["US"],
    },
    line_items: [
      {
        price_data: {
          currency: PRODUCT.currency,
          unit_amount: PRODUCT.priceCents,
          product_data: {
            name: PRODUCT.name,
            description: `Size: ${size}`,
          },
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: PRODUCT.currency,
          unit_amount: PRODUCT.shippingCents,
          product_data: {
            name: "Shipping",
          },
        },
        quantity: 1,
      },
    ],
    metadata: { size },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/`,
  });

  return NextResponse.json({ url: session.url });
}
