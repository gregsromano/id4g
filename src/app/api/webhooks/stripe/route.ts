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
      expand: [
        "line_items.data.price.product",
        "shipping_cost.shipping_rate",
        // Four levels is Stripe's hard maximum for `expand`; asking for
        // ...discount.promotion_code is five and fails the whole request with
        // a 400, which would break EVERY order, not just discounted ones.
        // So the promotion code arrives here as a bare id and is resolved
        // with a second call below, only when there actually is one.
        "total_details.breakdown.discounts.discount",
      ],
    });

    /**
     * Which delivery option the customer picked.
     *
     * Read from the chosen shipping rate's display_name rather than from a
     * $0 amount: comping shipping on a normal order would otherwise look
     * identical to a pickup. Falls back to "shipping" when the rate is
     * missing, which is the safe default — it keeps the order in the
     * shipping queue rather than silently dropping it from the list of
     * things to post.
     */
    const shippingRate = expanded.shipping_cost?.shipping_rate;
    const rateName =
      typeof shippingRate === "string" ? undefined : shippingRate?.display_name;
    const deliveryMethod = rateName?.toLowerCase().includes("pickup")
      ? "pickup"
      : "shipping";
    const items = itemsFromLineItems(expanded.line_items?.data ?? []);

    /**
     * Which promotion code the customer redeemed, if any.
     *
     * Checkout allows exactly one promotion code per session, so reading the
     * first entry is not a simplification that loses information. The code
     * string is only present when the discount came from a promotion code —
     * a coupon applied directly in the Stripe dashboard leaves it null, which
     * is why the amount is recorded separately rather than inferred from
     * whether a code exists.
     */
    const promotionCodeRef =
      expanded.total_details?.breakdown?.discounts?.[0]?.discount?.promotion_code;

    let discountCode: string | null = null;
    if (promotionCodeRef) {
      try {
        const promotionCode =
          typeof promotionCodeRef === "string"
            ? await getStripe().promotionCodes.retrieve(promotionCodeRef)
            : promotionCodeRef;
        discountCode = promotionCode.code;
      } catch (error) {
        // The code is reporting metadata, not something the order depends on.
        // Losing it must never cost us the order record itself, so this
        // degrades to null rather than throwing into the 500 path below —
        // amount_discount still records what came off.
        console.error("[stripe-webhook] could not resolve promotion code", {
          stripe_session_id: session.id,
          promotion_code: promotionCodeRef,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

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
      // Zero, not null, when no code was used: Stripe reports an explicit 0
      // on an undiscounted session, so this genuinely records "no discount"
      // rather than "never captured". Null is reserved for orders that
      // predate the column.
      amount_discount: session.total_details?.amount_discount ?? 0,
      discount_code: discountCode,
      items,
      items_summary: session.metadata?.items_summary,
      shipping_name: shipping?.name,
      shipping_address: shipping?.address,
      delivery_method: deliveryMethod,
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
