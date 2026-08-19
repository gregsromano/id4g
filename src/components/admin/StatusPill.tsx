import type { OrderStatus } from "@/lib/fulfillment";

const STYLES: Record<OrderStatus, string> = {
  pending: "border-[var(--text-muted)] text-[var(--text-muted)]",
  paid: "border-[var(--accent)] text-[var(--accent)]",
  fulfilled: "border-[var(--border)] text-[var(--text-muted)]",
  cancelled: "border-red-400 text-red-400",
};

export default function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
