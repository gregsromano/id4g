import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    let items: { size: string; quantity: number }[] | null = null;
    try {
      items = session.metadata?.items
        ? JSON.parse(session.metadata.items)
        : null;
    } catch {
      items = null;
    }

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
