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
 *
 * The customer's own confirmation (buildCustomerEmail) is sent only when
 * ORDER_EMAIL_FROM is set — i.e. from a verified domain — since the
 * unverified default can't reach anyone but the owner. Customer replies go
 * to ORDER_REPLY_TO, else the first ORDER_NOTIFY_EMAIL address.
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

/** Short reference shared with the admin, which shows the same first 8 characters of the order id. */
export function orderReference(orderId: string | null, stripeSessionId: string): string {
  return (orderId ?? stripeSessionId.replace(/^cs_(live|test)_/, "")).slice(0, 8).toUpperCase();
}

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

function notifyAddresses(): string[] {
  return (process.env.ORDER_NOTIFY_EMAIL ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * One Resend send. Never throws: the customer has paid and the order is
 * already saved, so a mail hiccup must not turn into a webhook failure
 * (Stripe would retry, hit the duplicate-order guard, and still not send).
 * Failures are logged for the Vercel logs instead.
 */
async function sendEmail(
  label: string,
  stripeSessionId: string,
  message: { to: string[]; replyTo?: string | null; subject: string; html: string; text: string },
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || message.to.length === 0) {
    console.warn(`[order-email] ${label} skipped: not configured`, { stripe_session_id: stripeSessionId });
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Stripe can deliver the same event twice; Resend drops a repeat key.
        "Idempotency-Key": `${label}-${stripeSessionId}`,
      },
      body: JSON.stringify({
        from: process.env.ORDER_EMAIL_FROM || "ID4G Orders <onboarding@resend.dev>",
        to: message.to,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[order-email] ${label} send failed`, {
        stripe_session_id: stripeSessionId,
        status: res.status,
        body: (await res.text()).slice(0, 500),
      });
    }
  } catch (error) {
    console.error(`[order-email] ${label} send failed`, {
      stripe_session_id: stripeSessionId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/** The owner's "new order" email. Reply goes straight to the customer. */
export async function sendOrderNotification(details: OrderEmailDetails): Promise<void> {
  const { subject, html, text } = buildOrderEmail(details);
  // "order" keeps the idempotency key the owner email has always used.
  await sendEmail("order", details.stripeSessionId, {
    to: notifyAddresses(),
    replyTo: details.customerEmail,
    subject,
    html,
    text,
  });
}

/** The customer's own order confirmation, from the store's verified address. */
export async function sendCustomerConfirmation(details: OrderEmailDetails): Promise<void> {
  if (!details.customerEmail) return;
  if (!process.env.ORDER_EMAIL_FROM) {
    console.warn("[order-email] customer confirmation skipped: ORDER_EMAIL_FROM not set", {
      stripe_session_id: details.stripeSessionId,
    });
    return;
  }
  const { subject, html, text } = buildCustomerEmail(details);
  await sendEmail("customer", details.stripeSessionId, {
    to: [details.customerEmail],
    replyTo: process.env.ORDER_REPLY_TO || notifyAddresses()[0] || null,
    subject,
    html,
    text,
  });
}

/**
 * What the buyer gets: thanks, order number, what they bought and paid,
 * where it's going, and a reply-to-reach-us line. No admin or Stripe links —
 * those are the owner's.
 */
export function buildCustomerEmail(details: OrderEmailDetails): { subject: string; html: string; text: string } {
  const ref = orderReference(details.orderId, details.stripeSessionId);
  const firstName = (details.customerName ?? "").trim().split(/\s+/)[0] || null;
  const pickup = details.deliveryMethod === "pickup";
  const hasCustom = details.items.some((item) => /^custom size:/i.test(item.variantLabel));
  const address = addressLines(details);
  const when = details.createdAt.toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    dateStyle: "long",
  });
  const lineTotal = (item: OrderItem) => (item.unitPriceCents === null ? null : item.unitPriceCents * item.quantity);
  const totals: [string, string][] = [
    ["Subtotal", money(details.subtotalCents)],
    ...(details.discountCents > 0
      ? [[`Discount${details.discountCode ? ` (${details.discountCode})` : ""}`, `−${money(details.discountCents)}`] as [string, string]]
      : []),
    [pickup ? "Local pickup" : "Shipping", pickup ? "Free" : money(details.shippingCents)],
    ["Sales tax", money(details.taxCents)],
  ];
  const deliveryText = pickup
    ? "You chose local pickup. We'll reach out to arrange a time to hand it over."
    // No promise of a shipping email: the store doesn't send one (tracking
    // lives in the admin only). Change this if that's ever added.
    : "We'll get it packed and on its way to you.";
  const customText =
    "Custom pieces are made to order just for you, so custom orders are final sale and can't be refunded.";

  const subject = `Your ID4G order #${ref} is confirmed`;

  const text = [
    `${firstName ? `Hi ${firstName},` : "Hi,"}`,
    ``,
    `Thanks for your order! Every piece is hand-made, and we're getting yours ready.`,
    ``,
    `Order #${ref} — ${when}`,
    ``,
    ...details.items.map(
      (item) =>
        `${item.quantity} × ${item.name}${item.variantLabel ? ` — ${item.variantLabel}` : ""}  ${money(lineTotal(item))}`,
    ),
    ``,
    ...totals.map(([label, value]) => `${label}: ${value}`),
    `Total: ${money(details.totalCents)}`,
    ``,
    ...(pickup ? [] : ["Shipping to:", ...(address.length ? address : ["(address on file)"]), ""]),
    deliveryText,
    ...(hasCustom ? ["", customText] : []),
    ``,
    `Questions? Just reply to this email.`,
    ``,
    `I'm Down For The Gospel`,
    `ID4G — ${absoluteUrl("/")}`,
  ].join("\n");

  const cell = "padding:10px 0;border-bottom:1px solid #e5e5e5;vertical-align:top";
  const itemRows = details.items
    .map(
      (item) => `<tr>
        <td style="${cell}"><strong>${esc(item.name)}</strong>${
          item.variantLabel ? `<br><span style="color:#666">${esc(item.variantLabel)}</span>` : ""
        }${item.quantity > 1 ? `<br><span style="color:#666">Qty ${item.quantity} × ${money(item.unitPriceCents)}</span>` : ""}</td>
        <td style="${cell};text-align:right;white-space:nowrap">${money(lineTotal(item))}</td>
      </tr>`,
    )
    .join("");
  const totalRows = totals
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 0;color:#666">${esc(label)}</td><td style="padding:4px 0;text-align:right">${esc(value)}</td></tr>`,
    )
    .join("");
  const heading = (title: string) =>
    `<h3 style="margin:28px 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#888">${title}</h3>`;

  const html = `<!doctype html><html><body style="margin:0;background:#f2f2f2;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111">
  <div style="max-width:560px;margin:0 auto">
    <div style="background:#050505;padding:22px 28px">
      <a href="${esc(absoluteUrl("/"))}" style="color:#fff;text-decoration:none;font-size:26px;font-weight:900;letter-spacing:.04em">ID4G</a>
      <div style="color:#38d6f5;font-size:11px;letter-spacing:.18em;text-transform:uppercase;margin-top:2px">I'm Down For The Gospel</div>
    </div>
    <div style="background:#fff;padding:28px">
      <h1 style="margin:0 0 6px;font-size:24px">Thanks for your order${firstName ? `, ${esc(firstName)}` : ""}!</h1>
      <p style="margin:0;color:#444;line-height:1.5">Every piece is hand-made, and we're getting yours ready.</p>
      <p style="margin:14px 0 0;color:#888;font-size:14px">Order <strong style="color:#111">#${esc(ref)}</strong> · ${esc(when)}</p>

      ${heading("Your order")}
      <table style="width:100%;border-collapse:collapse;font-size:15px">${itemRows}</table>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px">
        ${totalRows}
        <tr><td style="padding:10px 0 0;font-size:16px"><strong>Total</strong></td><td style="padding:10px 0 0;text-align:right;font-size:16px"><strong>${esc(money(details.totalCents))}</strong></td></tr>
      </table>

      ${
        pickup
          ? `${heading("Local pickup")}<p style="margin:0;line-height:1.5">${esc(deliveryText)}</p>`
          : `${heading("Shipping to")}<p style="margin:0;line-height:1.5">${
              address.length ? address.map(esc).join("<br>") : "(address on file)"
            }</p><p style="margin:10px 0 0;color:#444">${esc(deliveryText)}</p>`
      }

      ${
        hasCustom
          ? `<p style="margin:24px 0 0;padding:10px 12px;background:#f6f6f6;border-left:3px solid #111;font-size:14px;color:#333">${esc(customText)}</p>`
          : ""
      }

      <p style="margin:28px 0 0;line-height:1.5">Questions about your order? Just reply to this email.</p>
    </div>
    <p style="margin:0;padding:18px 28px;font-size:12px;color:#999;text-align:center">
      <a href="${esc(absoluteUrl("/"))}" style="color:#999">id4g.com</a> · Hand-made · No two pieces are exactly alike
    </p>
  </div></body></html>`;

  return { subject, html, text };
}
