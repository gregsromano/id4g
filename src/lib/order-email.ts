import type { OrderItem } from "./fulfillment";
import { formatPrice } from "./product";
import { absoluteUrl } from "./seo";

/**
 * The "you got an order" email to the store owner, sent by the Stripe
 * webhook once the order is saved. Everything needed to fulfil it without
 * opening the admin: what was bought, what was paid, where it goes, and how
 * to reach the buyer.
 *
 * Sent through Resend's HTTP API (no SDK). Configured by two env vars:
 *   RESEND_API_KEY       — from resend.com → API Keys
 *   ORDER_NOTIFY_EMAIL   — where to send it (comma-separate for several)
 * Optional ORDER_EMAIL_FROM overrides the sender; the default,
 * onboarding@resend.dev, works without verifying a domain but can only send
 * to the email address the Resend account was created with.
 */

export type OrderEmailDetails = {
  orderId: string | null;
  stripeSessionId: string;
  paymentIntentId: string | null;
  createdAt: Date;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  items: OrderItem[];
  subtotalCents: number | null;
  discountCents: number;
  discountCode: string | null;
  shippingCents: number | null;
  taxCents: number | null;
  totalCents: number | null;
  deliveryMethod: "shipping" | "pickup";
  shippingName: string | null;
  shippingAddress: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
};

const esc = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const money = (cents: number | null | undefined) => (cents === null || cents === undefined ? "—" : formatPrice(cents));

function addressLines(details: OrderEmailDetails): string[] {
  const a = details.shippingAddress;
  if (!a) return [];
  const cityLine = [a.city, [a.state, a.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [details.shippingName, a.line1, a.line2, cityLine, a.country && a.country !== "US" ? a.country : null].filter(
    (line): line is string => Boolean(line && line.trim()),
  );
}

export function buildOrderEmail(details: OrderEmailDetails): { subject: string; html: string; text: string } {
  const units = details.items.reduce((sum, item) => sum + item.quantity, 0);
  const who = details.customerName || details.customerEmail || "a customer";
  const pickup = details.deliveryMethod === "pickup";
  const subject = `New order: ${money(details.totalCents)} from ${who} (${units} item${units === 1 ? "" : "s"})${pickup ? " — LOCAL PICKUP" : ""}`;

  const adminUrl = details.orderId ? absoluteUrl(`/admin/orders/${details.orderId}`) : absoluteUrl("/admin");
  const stripeUrl = details.paymentIntentId
    ? `https://dashboard.stripe.com/payments/${details.paymentIntentId}`
    : null;
  const when = details.createdAt.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const address = addressLines(details);

  const lineTotal = (item: OrderItem) => (item.unitPriceCents === null ? null : item.unitPriceCents * item.quantity);

  const totals: [string, string][] = [
    ["Subtotal", money(details.subtotalCents)],
    ...(details.discountCents > 0
      ? [[`Discount${details.discountCode ? ` (code ${details.discountCode})` : ""}`, `−${money(details.discountCents)}`] as [string, string]]
      : []),
    [pickup ? "Shipping (local pickup)" : "Shipping", money(details.shippingCents)],
    ["Sales tax", money(details.taxCents)],
  ];

  // ---- plain text (also what shows in notification previews) ----
  const text = [
    `New order — ${when} (Pacific)`,
    ``,
    `CUSTOMER`,
    `${details.customerName ?? "(no name)"}`,
    `Email: ${details.customerEmail ?? "(none)"}`,
    ...(details.customerPhone ? [`Phone: ${details.customerPhone}`] : []),
    ``,
    `ITEMS`,
    ...details.items.map(
      (item) =>
        `${item.quantity} × ${item.name}${item.variantLabel ? ` — ${item.variantLabel}` : ""}  @ ${money(item.unitPriceCents)} = ${money(lineTotal(item))}`,
    ),
    ``,
    ...totals.map(([label, value]) => `${label}: ${value}`),
    `TOTAL PAID: ${money(details.totalCents)}`,
    ``,
    pickup ? `DELIVERY: LOCAL PICKUP — arrange the handover with the customer.` : `SHIP TO`,
    ...(pickup ? (address.length ? [`Address on file:`, ...address] : []) : address.length ? address : ["(no address)"]),
    ``,
    `Order in admin: ${adminUrl}`,
    ...(stripeUrl ? [`Payment in Stripe: ${stripeUrl}`] : []),
    `Stripe checkout session: ${details.stripeSessionId}`,
  ].join("\n");

  // ---- HTML ----
  const cell = "padding:8px 10px;border-bottom:1px solid #e5e5e5;vertical-align:top";
  const itemRows = details.items
    .map(
      (item) => `<tr>
        <td style="${cell}"><strong>${esc(item.name)}</strong>${
          item.variantLabel ? `<br><span style="color:#555">${esc(item.variantLabel)}</span>` : ""
        }</td>
        <td style="${cell};text-align:center">${item.quantity}</td>
        <td style="${cell};text-align:right">${money(item.unitPriceCents)}</td>
        <td style="${cell};text-align:right">${money(lineTotal(item))}</td>
      </tr>`,
    )
    .join("");
  const totalRows = totals
    .map(
      ([label, value]) =>
        `<tr><td colspan="3" style="padding:4px 10px;text-align:right;color:#555">${esc(label)}</td><td style="padding:4px 10px;text-align:right">${esc(value)}</td></tr>`,
    )
    .join("");
  const section = (title: string, body: string) =>
    `<h3 style="margin:24px 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#777">${title}</h3>${body}`;

  const deliveryHtml = pickup
    ? `<p style="margin:0;padding:10px 12px;background:#fff4e0;border-left:4px solid #e8962e"><strong>Local pickup</strong> — no shipping. Arrange the handover with the customer.${
        address.length ? `<br><span style="color:#555">Address on file: ${address.map(esc).join(", ")}</span>` : ""
      }</p>`
    : `<p style="margin:0;line-height:1.5">${address.length ? address.map(esc).join("<br>") : "(no address)"}</p>`;

  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f4;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111">
  <div style="max-width:620px;margin:0 auto;background:#fff;padding:24px">
    <h2 style="margin:0 0 4px">New order — ${esc(money(details.totalCents))}</h2>
    <p style="margin:0;color:#777">${esc(when)} (Pacific)</p>

    ${section(
      "Customer",
      `<p style="margin:0;line-height:1.5"><strong>${esc(details.customerName ?? "(no name)")}</strong><br>${
        details.customerEmail
          ? `<a href="mailto:${esc(details.customerEmail)}">${esc(details.customerEmail)}</a>`
          : "(no email)"
      }${details.customerPhone ? `<br>${esc(details.customerPhone)}` : ""}</p>`,
    )}

    ${section(
      "Items",
      `<table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr style="background:#fafafa"><th style="${cell};text-align:left">Item</th><th style="${cell}">Qty</th><th style="${cell};text-align:right">Price</th><th style="${cell};text-align:right">Total</th></tr>
        ${itemRows}
        ${totalRows}
        <tr><td colspan="3" style="padding:8px 10px;text-align:right"><strong>Total paid</strong></td><td style="padding:8px 10px;text-align:right"><strong>${esc(money(details.totalCents))}</strong></td></tr>
      </table>`,
    )}

    ${section(pickup ? "Delivery" : "Ship to", deliveryHtml)}

    <p style="margin:28px 0 0">
      <a href="${esc(adminUrl)}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;text-decoration:none">Open order in admin</a>
      ${stripeUrl ? `&nbsp; <a href="${esc(stripeUrl)}" style="color:#555">View payment in Stripe</a>` : ""}
    </p>
    <p style="margin:16px 0 0;font-size:12px;color:#999">Stripe checkout session ${esc(details.stripeSessionId)}</p>
  </div></body></html>`;

  return { subject, html, text };
}

/**
 * Sends the owner notification. Never throws: the customer has paid and the
 * order is already saved, so a mail hiccup must not turn into a webhook
 * failure (Stripe would retry, hit the duplicate-order guard, and still not
 * send). Failures are logged for the Vercel logs instead.
 */
export async function sendOrderNotification(details: OrderEmailDetails): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = (process.env.ORDER_NOTIFY_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!apiKey || to.length === 0) {
    console.warn("[order-email] skipped: RESEND_API_KEY or ORDER_NOTIFY_EMAIL not set", {
      stripe_session_id: details.stripeSessionId,
    });
    return;
  }

  const { subject, html, text } = buildOrderEmail(details);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Stripe can deliver the same event twice; Resend drops a repeat key.
        "Idempotency-Key": `order-${details.stripeSessionId}`,
      },
      body: JSON.stringify({
        from: process.env.ORDER_EMAIL_FROM || "ID4G Orders <onboarding@resend.dev>",
        to,
        // Hitting Reply goes straight to the customer.
        ...(details.customerEmail ? { reply_to: details.customerEmail } : {}),
        subject,
        html,
        text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("[order-email] send failed", {
        stripe_session_id: details.stripeSessionId,
        status: res.status,
        body: (await res.text()).slice(0, 500),
      });
    }
  } catch (error) {
    console.error("[order-email] send failed", {
      stripe_session_id: details.stripeSessionId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
