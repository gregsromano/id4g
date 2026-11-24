import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getVariantsForCheckout, type CheckoutVariant } from "@/lib/products";
import { buildVariantLabel } from "@/lib/variant";
import { UNIT_WEIGHT_OZ } from "@/lib/fulfillment";
import { syncScheduledCodes } from "@/lib/discounts";
import { getSiteSettings, type SiteSettings } from "@/lib/settings";
import { isPurchasable, isUuid, priceLine, regularLinePriceCents } from "@/lib/line-pricing";

type IncomingItem = {
  productId: string;
  variantId: string;
  quantity: number;
  /** Free-text fulfillment note marking a made-to-order recreation, priced by customVersionPriceCents. */
  customNote?: string;
};

type NormalizedLine = {
  variantId: string;
  productId: string;
  quantity: number;
  priceCents: number;
  currency: string;
  productName: string;
  variantLabel: string;
  customNote: string;
  taxCode: string;
  weightOz: number;
  shippingCents: number;
  /** A live sale (product or site-wide) lowered this line's price. */
  onSale: boolean;
};

/** Stripe metadata values are capped at 500 chars; this leaves headroom. */
const MAX_CUSTOM_NOTE_LENGTH = 300;

/**
 * Validate + normalize the cart the client sent. Prices, product names, tax
 * codes, and shipping are always looked up server-side by variant id — never
 * trusted from the request body. A mismatched productId/variantId pairing, an
 * unknown variant, or a non-active product all invalidate the whole cart.
 */
function normalize(
  items: unknown,
  variants: CheckoutVariant[],
  sitewideSale: SiteSettings["sitewideSale"],
): NormalizedLine[] | null {
  if (!Array.isArray(items) || items.length === 0) return null;

  // Keyed by variantId + customNote (not just variantId): a custom-size
  // recreation and the plain original are the same variant but different
  // fulfillment instructions, so they must stay separate order lines rather
  // than silently combining quantities.
  const merged = new Map<
    string,
    { productId: string; variantId: string; quantity: number; customNote: string }
  >();
  for (const raw of items as IncomingItem[]) {
    if (!raw || !isUuid(raw.productId) || !isUuid(raw.variantId)) {
      return null;
    }
    const qty = Number(raw.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return null;

    const customNote =
      typeof raw.customNote === "string" ? raw.customNote.trim().slice(0, MAX_CUSTOM_NOTE_LENGTH) : "";

    const key = `${raw.variantId}::${customNote}`;
    const existing = merged.get(key);
    if (existing) {
      if (existing.productId !== raw.productId) return null;
      existing.quantity += qty;
    } else {
      merged.set(key, { productId: raw.productId, variantId: raw.variantId, quantity: qty, customNote });
    }
  }

  const byVariantId = new Map(variants.map((v) => [v.variantId, v]));
  const lines: NormalizedLine[] = [];
  // One clock reading for the whole cart, so a sale ending mid-request
  // can't price two lines of the same product differently.
  const now = Date.now();

  for (const { productId, variantId, quantity, customNote } of merged.values()) {
    const variant = byVariantId.get(variantId);
    if (!variant) return null;
    // Spoofed productId/variantId pairing, a product that isn't live, or a
    // sold one-of-one claimed as the original rather than a custom version.
    if (!isPurchasable(variant, productId, customNote)) return null;

    // Same rule /api/cart/prices shows in the cart drawer. A live sale
    // lowers unit_amount itself rather than attaching a Stripe coupon, so
    // Stripe Tax computes on the price actually charged.
    const priced = priceLine(variant, customNote, sitewideSale, now);

    lines.push({
      variantId,
      productId,
      quantity,
      ...priced,
      onSale: priced.priceCents < regularLinePriceCents(variant, customNote),
      currency: variant.product.currency,
      productName: variant.product.name,
      variantLabel: buildVariantLabel(variant.optionValues, variant.product.options),
      customNote,
      taxCode: variant.product.taxCode,
      weightOz: variant.product.weightOz ?? UNIT_WEIGHT_OZ,
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
            // Only well-formed ids reach the database; a malformed one would
            // make the lookup error out (500) instead of an "Invalid cart" 400.
            .filter(isUuid),
        ),
      ]
    : [];

  // Independent reads. getSiteSettings never throws — it falls back to
  // defaults, which means no site-wide discount rather than a failed checkout.
  const [variants, { sitewideSale }] = await Promise.all([
    getVariantsForCheckout(requestedVariantIds),
    getSiteSettings(),
  ]);
  const normalized = normalize(body?.items, variants, sitewideSale);

  if (!normalized) {
    return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
  }

  const currency = normalized[0].currency;
  const cartHasSale = normalized.some((line) => line.onSale);

  // tax_behavior "exclusive" = tax is added on top of the listed price.
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = normalized.map((line) => {
    // A custom-size recreation note takes the place of the (empty, for a
    // one-of-one) catalog variant label — this is the only plumbing a
    // custom order needs: it rides the existing variantLabel metadata field
    // straight through the webhook into the order the admin sees.
    const displayLabel = line.customNote || line.variantLabel;
    return {
      price_data: {
        currency,
        unit_amount: line.priceCents,
        tax_behavior: "exclusive" as const,
        product_data: {
          name: displayLabel ? `${line.productName} — ${displayLabel}` : line.productName,
          description: displayLabel || undefined,
          tax_code: line.taxCode,
          metadata: {
            kind: "product",
            productId: line.productId,
            variantId: line.variantId,
            name: line.productName,
            variantLabel: displayLabel,
            weightOz: String(line.weightOz),
          },
        },
      },
      quantity: line.quantity,
    };
  });

  // One flat shipping charge for the order, sized to whichever distinct
  // product costs the most to ship — same simplification as the cart preview.
  const shippingCents = Math.max(...normalized.map((line) => line.shippingCents));

  // Compact summary stored on the session for a quick read on the success
  // page before the webhook's authoritative expand-based reconstruction.
  const itemsSummary = normalized
    .map((line) => `${line.customNote || line.variantLabel || line.productName} x${line.quantity}`)
    .join(", ");

  // Turn on any code whose start date has passed, so a scheduled code is
  // live the moment a customer could use it rather than waiting for a daily
  // cron. Never throws; a failure just means it activates a little later.
  await syncScheduledCodes();

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    // Stripe Tax computes sales tax from the shipping address, and only
    // charges in states where you've added a tax registration.
    automatic_tax: { enabled: true },
    // Renders Stripe's "Add promotion code" box — except when anything in
    // the cart is on sale: a sale price is already the discount, and promo
    // codes never stack on top of it. Stripe applies a code to the whole
    // order, so one sale item turns codes off for the entire checkout.
    // Validation, redemption limits and active/inactive state are enforced
    // by Stripe at redemption, and Stripe Tax recomputes tax on the
    // DISCOUNTED subtotal.
    allow_promotion_codes: !cartHasSale,
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
