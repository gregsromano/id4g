import ImportTrackingForm from "@/components/admin/ImportTrackingForm";

export const dynamic = "force-dynamic";

export default function ImportTrackingPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <span className="section-label">Fulfillment</span>
      <h1 className="!text-4xl mt-1 text-[var(--text-primary)]">Import tracking</h1>

      <div className="mt-6 border border-[var(--border)] p-6">
        <span className="section-label">How this works</span>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--text-body)]">
          <li>
            Export unfulfilled orders from the{" "}
            <a
              href="/api/admin/export?filter=open"
              className="text-[var(--accent)] hover:underline"
            >
              orders page
            </a>
            .
          </li>
          <li>
            Upload that file to Pirate Ship. When it asks you to map columns,
            map <strong className="text-[var(--text-primary)]">Order ID</strong> as a
            passthrough field — that is what lets tracking numbers find their way
            back to the right orders.
          </li>
          <li>Buy your labels.</li>
          <li>
            In Pirate Ship, select the shipments and choose{" "}
            <strong className="text-[var(--text-primary)]">Export</strong>, then paste
            that CSV below.
          </li>
        </ol>
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Matched orders are marked fulfilled and stamped with their tracking
          number. Re-importing the same file is safe — it will not change ship
          dates that are already recorded.
        </p>
      </div>

      <ImportTrackingForm />
    </div>
  );
}
