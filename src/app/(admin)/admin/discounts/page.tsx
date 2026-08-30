import { listDiscountCodes } from "@/lib/discounts";
import DiscountsTable from "@/components/admin/DiscountsTable";
import NewDiscountForm from "@/components/admin/NewDiscountForm";

// Codes live in Stripe, and can also be changed from the Stripe dashboard,
// so this page must never be served from a cache.
export const dynamic = "force-dynamic";

export default async function AdminDiscountsPage() {
  const codes = await listDiscountCodes();

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div>
        <span className="section-label">Marketing</span>
        <h1 className="!text-4xl mt-1 text-[var(--text-primary)]">Discount codes</h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--text-muted)]">
          Customers enter these in the “Add promotion code” box at checkout.
          A code works the moment it is created, and tax is recalculated on the
          discounted total automatically.
        </p>
      </div>

      <NewDiscountForm />

      <DiscountsTable codes={codes} />
    </div>
  );
}
