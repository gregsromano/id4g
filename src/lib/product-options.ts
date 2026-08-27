import type { ProductOption } from "./variant";

/**
 * Plain-text encoding for a product's options, used by the admin create/edit
 * forms: one option per line, e.g. "Size: S, M, L, XL". Pure helpers only —
 * kept out of the "use server" actions file because every export there must
 * be an async server action.
 */

/**
 * Fixed category list the admin picks from. Deliberately code-controlled
 * (not a DB-backed, self-service taxonomy) — adding a category is a one-line
 * change here, not a new admin CRUD surface. Not enforced by the database;
 * this is the single source of truth for what the <select> offers.
 */
export const PRODUCT_CATEGORIES = [
  "T-Shirt",
  "Hoodie",
  "Sweatshirt",
  "Tank Top",
  "Long Sleeve",
  "Other",
] as const;

export function parseOptionsText(text: string): ProductOption[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, rest] = line.split(":");
      const values = (rest ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      return { name: (name ?? "").trim(), values };
    })
    .filter((option) => option.name.length > 0 && option.values.length > 0);
}

export function optionsToText(options: ProductOption[]): string {
  return options.map((o) => `${o.name}: ${o.values.join(", ")}`).join("\n");
}

/** Every combination of an option list's values, e.g. Size x Color -> 6 combos. */
export function cartesianCombinations(options: ProductOption[]): Record<string, string>[] {
  if (options.length === 0) return [];
  return options.reduce<Record<string, string>[]>(
    (acc, option) =>
      acc.flatMap((combo) => option.values.map((value) => ({ ...combo, [option.name]: value }))),
    [{}],
  );
}
