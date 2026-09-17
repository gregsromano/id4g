import { listDiscountCodes, syncScheduledCodes } from "@/lib/discounts";
import DiscountsTable from "@/components/admin/DiscountsTable";
import NewDiscountForm from "@/components/admin/NewDiscountForm";

// Codes live in Stripe, and can also be changed from the Stripe dashboard,
// so this page must never be served from a cache.
export const dynamic = "force-dynamic";

export default async function AdminDiscountsPage() {
  // Sync first so a code whose start date has passed shows as live here
  // rather than as still-scheduled.
  await syncScheduledCodes();
  const codes = await listDiscountCodes();

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div>
        <span className="section-label">Marketing</span>
        <h1 className="!text-4xl mt-1 text-[var(--text-primary)]">Discount codes</h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--text-muted)]">
          Customers enter these in the “Add promotion code” box at checkout, and
          tax is recalculated on the discounted total automatically. A code works
          immediately unless you give it a start date, and Stripe stops accepting
          it once it hits its limit — set those below, since they cannot be added
          to a code afterwards.
        </p>
      </div>

      <NewDiscountForm />

      <DiscountsTable codes={codes} />
    </div>
  );
}
