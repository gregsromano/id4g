import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-dal";
import { listOrdersForExport, type OrderFilter } from "@/lib/admin-orders";
import { toCsv } from "@/lib/csv";
import { orderWeightOz } from "@/lib/fulfillment";

/**
 * Order export, shaped for Pirate Ship's spreadsheet import.
 *
 * Pirate Ship has no public API, so this CSV is the integration. Their import
 * accepts arbitrary column headers and maps them during upload; the required
 * fields are Name, Street, City, State and Zipcode.
 *
 * "Order ID" is the Passthrough column: Pirate Ship carries unmapped fields
 * through to its own post-label export, which is what lets the tracking import
 * at /admin/import match rows exactly instead of guessing from names.
 */

const HEADERS = [
  "Order ID",
  "Name",
  "Address 1",
  "Address 2",
  "City",
  "State",
  "Zipcode",
  "Country",
  "Email",
  "Weight (oz)",
  "Items",
];

function isFilter(value: string | null): value is OrderFilter {
  return value === "open" || value === "fulfilled" || value === "all";
}

export async function GET(req: NextRequest) {
  // This route hands out every customer's postal address; it must never be
  // reachable without a session.
  await requireAdmin();

  const filterParam = req.nextUrl.searchParams.get("filter");
  const filter: OrderFilter = isFilter(filterParam) ? filterParam : "open";

  const orders = await listOrdersForExport(filter);

  const rows: unknown[][] = [];
  let skipped = 0;

  for (const order of orders) {
    const address = order.shippingAddress;
    // A row missing a street address fails Pirate Ship's import for the whole
    // file, so drop it here and report the count in a header instead.
    if (!address?.line1) {
      skipped += 1;
      continue;
    }

    rows.push([
      order.id,
      order.shippingName ?? order.customerName ?? "",
      address.line1,
      address.line2 ?? "",
      address.city ?? "",
      address.state ?? "",
      address.postal_code ?? "",
      address.country ?? "US",
      order.customerEmail ?? "",
      orderWeightOz(order.items),
      order.itemsSummary,
    ]);
  }

  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(toCsv(HEADERS, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="id4g-orders-${filter}-${today}.csv"`,
      "X-Orders-Exported": String(rows.length),
      "X-Orders-Skipped": String(skipped),
    },
  });
}
