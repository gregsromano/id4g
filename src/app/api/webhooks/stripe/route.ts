import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import Stripe from "stripe";

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

    let items: unknown = null;
    try {
      items = session.metadata?.items
        ? JSON.parse(session.metadata.items)
        : null;
    } catch {
      items = null;
    }

    await supabaseAdmin.from("orders").insert({
      stripe_session_id: session.id,
      customer_email: session.customer_details?.email,
      customer_name: session.customer_details?.name,
      amount_total: session.amount_total,
      items,
      items_summary: session.metadata?.items_summary,
      shipping_name: shipping?.name,
      shipping_address: shipping?.address,
      status: "paid",
    });
  }

  return NextResponse.json({ received: true });
}
