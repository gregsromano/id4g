import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { UNIT_WEIGHT_OZ, type OrderItem } from "@/lib/fulfillment";
import Stripe from "stripe";

/**
 * Reconstructs the point-of-sale item snapshot from the session's line items,
 * rather than from `session.metadata` (which has a ~500-char-per-value limit
 * that a growing multi-line JSON blob would eventually hit). Each line's
 * product was created ad-hoc by /api/checkout with the snapshot stamped into
 * its own metadata, so it's durable on Stripe's side and immune to that
 * per-session limit.
 */
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
      unitPriceCents: line.price?.unit_amount ?? null,
      unitWeightOz: Number(metadata.weightOz) || UNIT_WEIGHT_OZ,
      quantity,
    });
  }

  return items;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json(
      { error: `Webhook signature verification failed` },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const supabaseAdmin = getSupabaseAdmin();
    const shipping = session.collected_information?.shipping_details;

    const expanded = await getStripe().checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price.product"],
    });
    const items = itemsFromLineItems(expanded.line_items?.data ?? []);

    // The customer has already paid at this point. If we cannot record the
    // order we must NOT return 2xx: Stripe treats that as delivered and never
    // retries, leaving a paid order with nothing to ship against. Returning
    // 5xx makes Stripe retry with backoff.
    const { error } = await supabaseAdmin.from("orders").insert({
      stripe_session_id: session.id,
      customer_email: session.customer_details?.email,
      customer_name: session.customer_details?.name,
      amount_total: session.amount_total,
      // Stripe Tax is enabled, so amount_total includes sales tax. Record the
      // tax and pre-tax components separately — both are already on the
      // session, so this costs no extra API call, and without them the tax
      // collected for a filing can't be derived from our own data.
      amount_tax: session.total_details?.amount_tax,
      amount_subtotal: session.amount_subtotal,
      items,
      items_summary: session.metadata?.items_summary,
      shipping_name: shipping?.name,
      shipping_address: shipping?.address,
      status: "paid",
    });

    if (error) {
      // Retrying a delivered event re-inserts the same session. The unique
      // constraint on stripe_session_id makes that a no-op rather than a
      // duplicate order, so treat it as success.
      if (error.code === "23505") {
        return NextResponse.json({ received: true, duplicate: true });
      }

      console.error("[stripe-webhook] order insert failed", {
        stripe_session_id: session.id,
        customer_email: session.customer_details?.email,
        amount_total: session.amount_total,
        items_summary: session.metadata?.items_summary,
        code: error.code,
        message: error.message,
        details: error.details,
      });

      return NextResponse.json(
        { error: "Failed to record order" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true });
}
