/**
 * Pure variant-option helpers shared between server-only catalog code
 * (src/lib/products.ts) and client components (the storefront purchase
 * panel). Deliberately has no "server-only" import so it can be bundled into
 * client code.
 */

export type ProductOption = { name: string; values: string[] };

/**
 * Canonical form of an option-value combination, e.g.
 * {Color:"Black", Size:"M"} -> "Color=Black|Size=M". Sorted by option name so
 * the same combination always produces the same key regardless of the order
 * fields were supplied in — this is what the unique index on
 * (product_id, option_key) enforces against, so it must never change shape
 * without a migration to match.
 */
export function variantOptionKey(optionValues: Record<string, string>): string {
  return Object.entries(optionValues)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}=${value}`)
    .join("|");
}

/** "Size M / Color Black", ordered by the product's own option definitions. */
export function buildVariantLabel(
  optionValues: Record<string, string>,
  options: ProductOption[],
): string {
  const ordered = options.length > 0 ? options.map((o) => o.name) : Object.keys(optionValues);
  return ordered
    .filter((name) => optionValues[name] !== undefined)
    .map((name) => `${name} ${optionValues[name]}`)
    .join(" / ");
}
