/**
 * Minimal RFC 4180 CSV encode/decode, shared by the Pirate Ship export and the
 * tracking re-import.
 */

/**
 * Formula characters. A cell beginning with one of these is executed by Excel
 * and Google Sheets when the file is opened — so a customer who sets their
 * name to `=HYPERLINK(...)` would run code on the operator's machine. Prefix
 * with an apostrophe to neutralize it.
 */
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);

  if (FORMULA_PREFIXES.some((prefix) => text.startsWith(prefix))) {
    text = `'${text}`;
  }

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }
  // Excel reads a bare UTF-8 file as the system codepage and mangles accented
  // names; the BOM tells it otherwise.
  return `﻿${lines.join("\r\n")}`;
}

/**
 * Parse a CSV into rows of cells, honoring quoted fields, escaped quotes, and
 * newlines inside quotes.
 */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      // Swallow the \n of a \r\n pair.
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => value.trim().length > 0));
}
