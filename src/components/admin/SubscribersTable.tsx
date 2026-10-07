"use client";

import { useState } from "react";

import type { Subscriber } from "@/lib/subscribers";

/**
 * The signup list, with copy-all and CSV export.
 *
 * Both exports are built in the BROWSER from data the page already has,
 * rather than through a download route: the list is small (it is a mailing
 * list, not an order history), and it avoids adding a second authenticated
 * endpoint that returns customer email addresses.
 */
export default function SubscribersTable({ subscribers }: { subscribers: Subscriber[] }) {
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(subscribers.map((s) => s.email).join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be denied; the addresses are on screen regardless.
    }
  }

  function downloadCsv() {
    // Quotes doubled and every field quoted, so a comma or quote inside a
    // value cannot shift the remaining columns.
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = [
      ["email", "phone", "sms_consent_at", "discount_code", "source", "signed_up"],
      ...subscribers.map((s) => [
        s.email,
        s.phone ?? "",
        // The consent timestamp, not a yes/no: an SMS provider importing
        // this list needs proof of WHEN consent was given, and a bare "yes"
        // is not that.
        s.smsConsentAt ?? "",
        s.discountCode ?? "",
        s.source,
        new Date(s.createdAt).toISOString(),
      ]),
    ];
    const csv = rows.map((r) => r.map(esc).join(",")).join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `id4g-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (subscribers.length === 0) {
    return (
      <p className="mt-8 border border-dashed border-[var(--border)] px-6 py-12 text-center text-sm text-[var(--text-muted)]">
        No signups yet. Turn the popup on above and they will appear here.
      </p>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
          {subscribers.length} subscriber{subscribers.length === 1 ? "" : "s"}
        </span>
        <div className="flex gap-3">
          <button type="button" onClick={copyAll} className="btn-outline !py-2 !px-5">
            {copied ? "Copied" : "Copy emails"}
          </button>
          <button type="button" onClick={downloadCsv} className="btn-outline !py-2 !px-5">
            Download CSV
          </button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[var(--bg-section-alt)]">
              <Th>Email</Th>
              <Th>Phone</Th>
              <Th>Their code</Th>
              <Th>Signed up</Th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((s) => (
              <tr key={s.email} className="border-b border-[var(--border)]">
                <Td>{s.email}</Td>
                <Td>
                  {s.phone ? (
                    <span className="whitespace-nowrap">
                      {s.phone}
                      {/* Consent is shown next to the number, because a
                          number without it must not be texted. */}
                      {s.smsConsentAt ? (
                        <span className="ml-2 text-[10px] uppercase tracking-widest text-[var(--accent)]">
                          SMS ok
                        </span>
                      ) : (
                        <span className="ml-2 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                          No SMS
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </Td>
                <Td>
                  <span className="font-mono text-xs text-[var(--accent)]">
                    {s.discountCode ?? "—"}
                  </span>
                </Td>
                <Td>
                  <span className="text-[var(--text-muted)]">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Below sm the three columns do not fit without a horizontal scroll,
          so each subscriber becomes a stacked row instead — same pattern as
          the products table. */}
      <ul className="mt-4 sm:hidden">
        {subscribers.map((s) => (
          <li key={s.email} className="border-b border-[var(--border)] py-3">
            <p className="break-all text-sm text-[var(--text-primary)]">{s.email}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              <span className="font-mono text-[var(--accent)]">
                {s.discountCode ?? "—"}
              </span>
              {" · "}
              {new Date(s.createdAt).toLocaleDateString()}
            </p>
            {s.phone && (
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {s.phone}
                <span
                  className={`ml-2 uppercase tracking-widest ${
                    s.smsConsentAt ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                  }`}
                >
                  {s.smsConsentAt ? "SMS ok" : "No SMS"}
                </span>
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs uppercase tracking-widest text-[var(--text-muted)]">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{children}</td>;
}
