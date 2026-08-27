/**
 * Shared styling for rendered rich-text HTML (product descriptions), used by
 * both the Tiptap editor's content area and the storefront's read-only
 * render, so what the admin sees while editing matches what shoppers see.
 * Hand-picked descendant selectors rather than the Tailwind typography
 * plugin, to match this site's own palette instead of generic prose
 * defaults.
 */
export const RICH_TEXT_CLASSES =
  "[&_p]:mb-3 [&_p:last-child]:mb-0 " +
  "[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2:first-child]:mt-0 " +
  "[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-bold " +
  "[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 " +
  "[&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_blockquote]:mb-3 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--accent)] [&_blockquote]:pl-4 [&_blockquote]:italic " +
  "[&_a]:text-[var(--accent)] [&_a]:underline " +
  "[&_strong]:font-bold [&_em]:italic [&_u]:underline [&_s]:line-through " +
  "[&_hr]:my-4 [&_hr]:border-[var(--border)]";

/**
 * Plain-text excerpt of a rich-text HTML description, for contexts that
 * can't render HTML: the meta description fallback (generateMetadata) and
 * the admin's SEO preview when no explicit meta description is set. A crude
 * regex strip is fine here — this never needs to be safe to re-render as
 * HTML, only readable as text.
 */
export function stripHtmlToText(html: string, maxLength = 300): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}
