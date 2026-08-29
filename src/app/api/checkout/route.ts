import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getVariantsForCheckout, type CheckoutVariant } from "@/lib/products";
import { buildVariantLabel } from "@/lib/variant";
import { UNIT_WEIGHT_OZ } from "@/lib/fulfillment";

type IncomingItem = { productId: string; variantId: string; quantity: number };

type NormalizedLine = {
  variantId: string;
  productId: string;
  quantity: number;
  priceCents: number;
  currency: string;
  productName: string;
  variantLabel: string;
  taxCode: string;
  weightOz: number;
  shippingCents: number;
};

/**
 * Validate + normalize the cart the client sent. Prices, product names, tax
 * codes, and shipping are always looked up server-side by variant id — never
 * trusted from the request body. A mismatched productId/variantId pairing, an
 * unknown variant, or a non-active product all invalidate the whole cart.
 */
function normalize(items: unknown, variants: CheckoutVariant[]): NormalizedLine[] | null {
  if (!Array.isArray(items) || items.length === 0) return null;

  const merged = new Map<string, { productId: string; quantity: number }>();
  for (const raw of items as IncomingItem[]) {
    if (!raw || typeof raw.productId !== "string" || typeof raw.variantId !== "string") {
      return null;
    }
    const qty = Number(raw.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return null;

    const existing = merged.get(raw.variantId);
    if (existing) {
      if (existing.productId !== raw.productId) return null;
      existing.quantity += qty;
    } else {
      merged.set(raw.variantId, { productId: raw.productId, quantity: qty });
    }
  }

  const byVariantId = new Map(variants.map((v) => [v.variantId, v]));
  const lines: NormalizedLine[] = [];

  for (const [variantId, { productId, quantity }] of merged) {
    const variant = byVariantId.get(variantId);
    if (!variant) return null;
    // Defense against a spoofed productId/variantId pairing.
    if (variant.productId !== productId) return null;
    if (variant.product.status !== "active") return null;

    lines.push({
      variantId,
      productId,
      quantity,
      priceCents: variant.priceCents,
      currency: variant.product.currency,
      productName: variant.product.name,
      variantLabel: buildVariantLabel(variant.optionValues, variant.product.options),
      taxCode: variant.product.taxCode,
      weightOz: variant.product.weightOz ?? UNIT_WEIGHT_OZ,
      shippingCents: variant.product.shippingCents,
    });
  }

  // Stripe Checkout requires one currency per session.
  if (new Set(lines.map((l) => l.currency)).size > 1) return null;

  return lines;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const requestedVariantIds = Array.isArray(body?.items)
    ? [
        ...new Set(
          (body.items as IncomingItem[])
            .map((i) => i?.variantId)
            .filter((id): id is string => typeof id === "string"),
        ),
      ]
    : [];

  const variants = await getVariantsForCheckout(requestedVariantIds);
  const normalized = normalize(body?.items, variants);

  if (!normalized) {
    return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
  }

  const currency = normalized[0].currency;

  // tax_behavior "exclusive" = tax is added on top of the listed price.
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = normalized.map((line) => ({
    price_data: {
      currency,
      unit_amount: line.priceCents,
      tax_behavior: "exclusive" as const,
      product_data: {
        name: line.variantLabel ? `${line.productName} — ${line.variantLabel}` : line.productName,
        description: line.variantLabel || undefined,
        tax_code: line.taxCode,
        metadata: {
          kind: "product",
          productId: line.productId,
          variantId: line.variantId,
          name: line.productName,
          variantLabel: line.variantLabel,
          weightOz: String(line.weightOz),
        },
      },
    },
    quantity: line.quantity,
  }));

  // One flat shipping charge for the order, sized to whichever distinct
  // product costs the most to ship — same simplification as the cart preview.
  const shippingCents = Math.max(...normalized.map((line) => line.shippingCents));

  // Compact summary stored on the session for a quick read on the success
  // page before the webhook's authoritative expand-based reconstruction.
  const itemsSummary = normalized
    .map((line) => `${line.variantLabel || line.productName} x${line.quantity}`)
    .join(", ");

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    // Stripe Tax computes sales tax from the shipping address, and only
    // charges in states where you've added a tax registration.
    automatic_tax: { enabled: true },
    // Shipping is a choice, not a fixed charge: some buyers collect in
    // person. Stripe renders these as radio buttons and records which one
    // was picked on the session, so the fulfillment queue can tell a pickup
    // from a shipment without a separate field.
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount" as const,
          fixed_amount: { amount: shippingCents, currency },
          display_name: "Standard shipping",
          tax_behavior: "exclusive" as const,
          // Shipping tax category.
          tax_code: "txcd_92010001",
        },
      },
      {
        shipping_rate_data: {
          type: "fixed_amount" as const,
          fixed_amount: { amount: 0, currency },
          display_name: "Local pickup — free",
          tax_behavior: "exclusive" as const,
          tax_code: "txcd_92010001",
        },
      },
    ],
    // Still collected even for pickup: Stripe Tax computes sales tax from
    // this address, so dropping it on pickup orders would silently
    // under-collect CA tax. It doubles as contact detail for arranging the
    // handover.
    shipping_address_collection: {
      allowed_countries: ["US"],
    },
    line_items,
    metadata: {
      items_summary: itemsSummary,
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/`,
  });

  return NextResponse.json({ url: session.url });
}
