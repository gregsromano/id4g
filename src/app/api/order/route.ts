import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

type OrderItem = {
  productId: string;
  variantId: string;
  name: string;
  variantLabel: string;
  quantity: number;
};

function itemsFromLineItems(lineItems: Stripe.LineItem[]): OrderItem[] {
  const items: OrderItem[] = [];

  for (const line of lineItems) {
    const product = line.price?.product;
    if (!product || typeof product === "string" || product.deleted) continue;

    const metadata = product.metadata ?? {};
    if (metadata.kind !== "product") continue; // skips the shipping line

    const quantity = line.quantity ?? 0;
    if (quantity < 1) continue;

    items.push({
      productId: metadata.productId ?? "",
      variantId: metadata.variantId ?? "",
      name: metadata.name || product.name || "Unknown product",
      variantLabel: metadata.variantLabel ?? "",
      quantity,
    });
  }

  return items;
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price.product"],
    });

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const items = itemsFromLineItems(session.line_items?.data ?? []);

    return NextResponse.json({
      email: session.customer_details?.email,
      amountTotal: session.amount_total,
      items,
      itemsSummary: session.metadata?.items_summary ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}
