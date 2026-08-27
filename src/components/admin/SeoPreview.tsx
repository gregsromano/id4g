"use client";

import { useState } from "react";

import { stripHtmlToText } from "@/lib/rich-text";

const SITE_HOST = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.id4g.com").replace(
  /^https?:\/\//,
  "",
);

const TITLE_LIMIT = 70;
const DESCRIPTION_LIMIT = 160;

/**
 * SEO fields + a Google-style search-result preview. Plain named inputs
 * (meta_title/meta_description), not their own form — this is rendered
 * inside the same top-level form as the rest of the product details, so it
 * saves with the top Save button like everything else on this page.
 */
export default function SeoPreview({
  slug,
  fallbackTitle,
  fallbackDescriptionHtml,
  defaultMetaTitle,
  defaultMetaDescription,
}: {
  slug: string;
  fallbackTitle: string;
  fallbackDescriptionHtml: string;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
}) {
  const [title, setTitle] = useState(defaultMetaTitle);
  const [description, setDescription] = useState(defaultMetaDescription);

  const fallbackDescription = stripHtmlToText(fallbackDescriptionHtml, DESCRIPTION_LIMIT);
  const previewTitle = title.trim() || fallbackTitle;
  const previewDescription = description.trim() || fallbackDescription;

  return (
    <div>
      <p className="mb-3 text-xs uppercase tracking-widest text-[var(--text-muted)]">
        Search engine listing
      </p>

      <div className="border border-[var(--border)] bg-white p-4 text-black">
        <div className="text-xs text-neutral-600">
          {SITE_HOST} › products › {slug || "…"}
        </div>
        <div className="mt-1 truncate text-lg text-blue-700">{previewTitle}</div>
        <div className="mt-1 line-clamp-2 text-sm text-neutral-700">{previewDescription}</div>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
          Page title
        </span>
        <input
          name="meta_title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={fallbackTitle}
          maxLength={TITLE_LIMIT}
          className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
        <span className="mt-1 block text-xs text-[var(--text-muted)]">
          {title.length} of {TITLE_LIMIT} characters used — blank uses the product name
        </span>
      </label>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs uppercase tracking-widest text-[var(--text-muted)]">
          Meta description
        </span>
        <textarea
          name="meta_description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={fallbackDescription}
          maxLength={DESCRIPTION_LIMIT}
          className="w-full border border-[var(--border)] bg-[var(--bg-section-alt)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
        <span className="mt-1 block text-xs text-[var(--text-muted)]">
          {description.length} of {DESCRIPTION_LIMIT} characters used — blank uses the product
          description
        </span>
      </label>
    </div>
  );
}
