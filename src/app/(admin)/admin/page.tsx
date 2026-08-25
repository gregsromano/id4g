import Link from "next/link";

import { getFulfillmentSummary, listOrders, type OrderFilter } from "@/lib/admin-orders";
import { formatPrice } from "@/lib/product";
import { orderUnitCount } from "@/lib/fulfillment";
import StatusPill from "@/components/admin/StatusPill";

// Order data must never be prerendered or cached between requests.
export const dynamic = "force-dynamic";

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: "open", label: "Unfulfilled" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "all", label: "All" },
];

function isFilter(value: string | undefined): value is OrderFilter {
  return value === "open" || value === "fulfilled" || value === "all";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  // searchParams is a Promise in Next 16 — synchronous access was removed.
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filter: OrderFilter = isFilter(params.filter) ? params.filter : "open";
  const search = params.q?.trim() ?? "";

  const [summary, orders] = await Promise.all([
    getFulfillmentSummary(),
    listOrders({ filter, search }),
  ]);

  const exportHref = `/api/admin/export?filter=${filter}`;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="section-label">Fulfillment</span>
          <h1 className="!text-4xl mt-1 text-[var(--text-primary)]">Orders</h1>
        </div>
        <a href={exportHref} className="btn-outline !py-3 !px-6">
          Export CSV for Pirate Ship
        </a>
      </div>

      {/* Summary tiles — all figures cover OPEN orders only. */}
      <div className="mt-8 grid grid-cols-2 gap-px border border-[var(--border)] bg-[var(--border)] lg:grid-cols-4">
        <Tile label="Open orders" value={String(summary.openOrders)} />
        <Tile label="Units to ship" value={String(summary.unitsToShip)} />
        <Tile label="Gross revenue" value={formatPrice(summary.grossRevenueCents)} />
        <Tile
          label="Tax collected"
          value={formatPrice(summary.taxCollectedCents)}
          // Orders predating the amount_tax column have no recorded tax. Say so
          // rather than letting the number read as a complete figure.
          note={
            summary.ordersMissingTax > 0
              ? `${summary.ordersMissingTax} order${
                  summary.ordersMissingTax === 1 ? "" : "s"
                } predate tax tracking`
              : undefined
          }
        />
      </div>

      {/* What to pull from inventory before packing. Unlike the old
          single-product size grid, this can't show every possible
          combination up front — there's no longer one fixed list across the
          whole catalog — so it only lists combos with open quantity. */}
      <div className="mt-6 border border-[var(--border)] p-5">
        <span className="section-label">Units to pull ({summary.unitsToShip} units)</span>
        {summary.variants.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">Nothing open.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-px bg-[var(--border)]">
            {summary.variants.map((row) => (
              <div
                key={`${row.productName}-${row.variantLabel}`}
                className="min-w-32 flex-1 bg-[var(--bg-primary)] px-4 py-3 text-center"
              >
                <div className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
                  {row.productName}
                  {row.variantLabel ? ` · ${row.variantLabel}` : ""}
                </div>
                <div className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                  {row.quantity}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters + search */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <nav className="flex gap-6">
          {FILTERS.map((option) => (
            <Link
              key={option.value}
              href={`/admin?filter=${option.value}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
              className={`text-xs uppercase tracking-widest transition-colors ${
                option.value === filter
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </nav>

        <form action="/admin" className="flex items-center gap-2">
          <input type="hidden" name="filter" value={filter} />
          <input
            name="q"
            defaultValue={search}
            placeholder="Search name or email"
            aria-label="Search orders"
            className="w-56 border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            className="border border-[var(--border)] px-3 py-2 text-xs uppercase tracking-widest text-[var(--text-body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Search
          </button>
        </form>
      </div>

      {orders.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--text-muted)]">
          {filter === "open"
            ? "Nothing to ship. All caught up."
            : "No orders match this view."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl border-collapse text-left">
            <thead>
              <tr className="bg-[var(--bg-section-alt)]">
                <Th>Date</Th>
                <Th>Customer</Th>
                <Th>Items</Th>
                <Th>Units</Th>
                <Th>Total</Th>
                <Th>Status</Th>
                <Th>Tracking</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[var(--border)] transition-colors hover:bg-[var(--bg-section-alt)]"
                >
                  <Td>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-[var(--text-body)] transition-colors hover:text-[var(--accent)]"
                    >
                      {formatDate(order.createdAt)}
                    </Link>
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="block text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
                    >
                      {order.shippingName ?? order.customerName ?? "—"}
                    </Link>
                    <span className="text-xs text-[var(--text-muted)]">
                      {order.customerEmail ?? "—"}
                    </span>
                  </Td>
                  <Td>{order.itemsSummary || "—"}</Td>
                  <Td>{orderUnitCount(order.items)}</Td>
                  <Td>{order.amountTotal === null ? "—" : formatPrice(order.amountTotal)}</Td>
                  <Td>
                    <StatusPill status={order.status} />
                  </Td>
                  <Td>
                    <span className="text-xs text-[var(--text-muted)]">
                      {order.trackingNumber ?? "—"}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="bg-[var(--bg-primary)] px-5 py-6">
      <div className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{value}</div>
      {note && <div className="mt-2 text-xs text-[var(--text-muted)]">{note}</div>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-[var(--border)] px-4 py-3 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-4 text-sm text-[var(--text-body)]">{children}</td>;
}
