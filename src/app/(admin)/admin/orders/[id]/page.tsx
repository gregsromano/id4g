import Link from "next/link";
import { notFound } from "next/navigation";

import { getOrder } from "@/lib/admin-orders";
import { formatAddressLines, orderWeightOz } from "@/lib/fulfillment";
import { formatPrice } from "@/lib/product";
import StatusPill from "@/components/admin/StatusPill";
import { markFulfilled, saveNote, saveTracking, unfulfill } from "../../actions";

export const dynamic = "force-dynamic";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminOrderDetailPage({
  params,
}: {
  // params is a Promise in Next 16 — synchronous access was removed.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) notFound();

  const addressLines = formatAddressLines(order.shippingAddress);
  const isFulfilled = order.status === "fulfilled";

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link
        href="/admin"
        className="text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
      >
        &larr; Back to orders
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="section-label">Order</span>
          <h1 className="!text-3xl mt-1 text-[var(--text-primary)]">
            {order.shippingName ?? order.customerName ?? "Unnamed order"}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {formatDateTime(order.createdAt)} · {order.id.slice(0, 8)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={order.status} />
          <Link href={`/admin/orders/${order.id}/slip`} className="btn-outline !py-3 !px-6">
            Packing slip
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-px bg-[var(--border)] md:grid-cols-2">
        <Panel title={order.deliveryMethod === "pickup" ? "Local pickup" : "Ship to"}>
          {order.deliveryMethod === "pickup" && (
            <p className="mb-3 border border-[var(--accent)] px-3 py-2 text-xs uppercase tracking-widest text-[var(--accent)]">
              Customer collects in person — no label needed
            </p>
          )}
          {addressLines.length > 0 ? (
            <address className="not-italic text-sm leading-relaxed text-[var(--text-body)]">
              {order.shippingName && (
                <div className="text-[var(--text-primary)]">{order.shippingName}</div>
              )}
              {addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </address>
          ) : (
            <p className="text-sm text-red-400">
              {order.deliveryMethod === "pickup"
                ? "No address on this order."
                : "No shipping address on this order — it cannot be exported to Pirate Ship."}
            </p>
          )}
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            {order.customerEmail ?? "No email"}
          </p>
        </Panel>

        <Panel title="Items">
          <ul className="text-sm text-[var(--text-body)]">
            {order.items.length > 0 ? (
              order.items.map((item) => (
                <li
                  key={`${item.productId}-${item.variantId}`}
                  className="flex justify-between py-1"
                >
                  <span>
                    {item.name}
                    {item.variantLabel ? ` — ${item.variantLabel}` : ""}
                  </span>
                  <span className="text-[var(--text-primary)]">&times;{item.quantity}</span>
                </li>
              ))
            ) : (
              <li className="text-[var(--text-muted)]">No line items recorded</li>
            )}
          </ul>
          <div className="mt-4 border-t border-[var(--border)] pt-3 text-sm">
            <Row label="Subtotal" value={order.amountSubtotal} />
            {/* Only when something actually came off. Every undiscounted
                order records a real 0, so showing the row unconditionally
                would put a "-$0.00" on almost every order. */}
            {order.amountDiscount !== null && order.amountDiscount > 0 && (
              <div className="flex justify-between py-1 text-[var(--text-body)]">
                <span>
                  Discount
                  {order.discountCode ? (
                    <span className="ml-2 text-xs uppercase tracking-widest text-[var(--accent)]">
                      {order.discountCode}
                    </span>
                  ) : null}
                </span>
                <span>-{formatPrice(order.amountDiscount)}</span>
              </div>
            )}
            <Row label="Tax" value={order.amountTax} />
            <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-2 font-bold text-[var(--text-primary)]">
              <span>Total</span>
              <span>
                {order.amountTotal === null ? "—" : formatPrice(order.amountTotal)}
              </span>
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Est. shipping weight {orderWeightOz(order.items)} oz
            </p>
          </div>
        </Panel>
      </div>

      {/* Tracking */}
      <section className="mt-8 border border-[var(--border)] p-6">
        <span className="section-label">Tracking</span>
        <form action={saveTracking} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={order.id} />
          <label className="flex-1 min-w-56">
            <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Tracking number
            </span>
            <input
              name="tracking_number"
              defaultValue={order.trackingNumber ?? ""}
              className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="w-40">
            <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
              Carrier
            </span>
            <input
              name="tracking_carrier"
              defaultValue={order.trackingCarrier ?? ""}
              placeholder="USPS"
              className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <button
            type="submit"
            className="border border-[var(--border)] px-4 py-2 text-xs uppercase tracking-widest text-[var(--text-body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Save
          </button>
        </form>
      </section>

      {/* Internal notes */}
      <section className="mt-6 border border-[var(--border)] p-6">
        <span className="section-label">Internal notes</span>
        <form action={saveNote} className="mt-4">
          <input type="hidden" name="id" value={order.id} />
          <textarea
            name="admin_notes"
            rows={3}
            defaultValue={order.adminNotes ?? ""}
            placeholder="Customer asked to swap size; address confirmed by email..."
            className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            className="mt-3 border border-[var(--border)] px-4 py-2 text-xs uppercase tracking-widest text-[var(--text-body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Save note
          </button>
        </form>
      </section>

      {/* Fulfillment */}
      <section className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-[var(--border)] p-6">
        <div>
          <span className="section-label">Fulfillment</span>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {isFulfilled && order.fulfilledAt
              ? `Shipped ${formatDateTime(order.fulfilledAt)}`
              : "Not yet shipped."}
          </p>
        </div>
        {isFulfilled ? (
          <form action={unfulfill}>
            <input type="hidden" name="id" value={order.id} />
            <button
              type="submit"
              className="border border-[var(--border)] px-4 py-3 text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:border-red-400 hover:text-red-400"
            >
              Undo fulfillment
            </button>
          </form>
        ) : (
          <form action={markFulfilled}>
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="tracking_number" value={order.trackingNumber ?? ""} />
            <input type="hidden" name="tracking_carrier" value={order.trackingCarrier ?? ""} />
            <button type="submit" className="btn-primary">
              Mark fulfilled
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-primary)] p-6">
      <span className="section-label">{title}</span>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** Renders an unknown amount as "—" rather than "$0.00". */
function Row({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex justify-between py-1 text-[var(--text-body)]">
      <span>{label}</span>
      <span>{value === null ? "—" : formatPrice(value)}</span>
    </div>
  );
}
