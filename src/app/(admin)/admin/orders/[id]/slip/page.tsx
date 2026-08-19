import Link from "next/link";
import { notFound } from "next/navigation";

import { getOrder } from "@/lib/admin-orders";
import { formatAddressLines, orderUnitCount, orderWeightOz } from "@/lib/fulfillment";
import { PRODUCT } from "@/lib/product";

export const dynamic = "force-dynamic";

/**
 * Printable packing slip.
 *
 * A separate route rather than a modal so Cmd+P produces a clean page. It
 * renders dark-on-white deliberately: the storefront's near-black palette
 * would empty a print cartridge and photocopies of it are unreadable.
 */
export default async function PackingSlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) notFound();

  const addressLines = formatAddressLines(order.shippingAddress);

  return (
    <div className="mx-auto w-full max-w-2xl bg-white p-10 text-black print:p-0">
      <div className="no-print mb-6 flex justify-between">
        <Link
          href={`/admin/orders/${order.id}`}
          className="text-xs uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent)]"
        >
          &larr; Back to order
        </Link>
        <span className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
          Print with &#8984;P
        </span>
      </div>

      <header className="flex items-start justify-between border-b-2 border-black pb-4">
        <div>
          <h1 className="!text-3xl !text-black">I Die For The Gospel</h1>
          <p className="text-xs uppercase tracking-widest text-neutral-600">
            Packing slip
          </p>
        </div>
        <div className="text-right text-xs text-neutral-600">
          <div>Order {order.id.slice(0, 8).toUpperCase()}</div>
          <div>
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="!text-base !text-black">Ship to</h2>
        <address className="mt-2 not-italic text-sm leading-relaxed">
          {order.shippingName && <div>{order.shippingName}</div>}
          {addressLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </address>
      </section>

      <section className="mt-8">
        <h2 className="!text-base !text-black">Items</h2>
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="py-2 font-bold">Item</th>
              <th className="py-2 font-bold">Size</th>
              <th className="py-2 text-right font-bold">Qty</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.size} className="border-b border-neutral-300">
                <td className="py-2">{PRODUCT.name}</td>
                <td className="py-2">{item.size}</td>
                <td className="py-2 text-right">{item.quantity}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-2 font-bold" colSpan={2}>
                Total units
              </td>
              <td className="py-2 text-right font-bold">
                {orderUnitCount(order.items)}
              </td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-2 text-xs text-neutral-600">
          Est. weight {orderWeightOz(order.items)} oz
        </p>
      </section>

      {order.adminNotes && (
        <section className="mt-8 border border-neutral-400 p-4">
          <h2 className="!text-base !text-black">Notes</h2>
          <p className="mt-1 text-sm whitespace-pre-wrap">{order.adminNotes}</p>
        </section>
      )}

      <footer className="mt-12 border-t border-neutral-300 pt-4 text-center text-xs text-neutral-600">
        Thank you for supporting the drop. — id4g.com
      </footer>
    </div>
  );
}
