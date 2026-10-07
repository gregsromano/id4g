/**
 * Shared SEO helpers.
 *
 * Not `server-only`: the JSON-LD serializer is pure and the canonical URL is
 * used in metadata, so there is nothing secret here.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.id4g.com";

export const SITE_NAME = "I'm Down For The Gospel";

/** Absolute URL for a site-relative path — canonicals and JSON-LD need absolute. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

/**
 * Strip HTML and collapse whitespace, then cut to a length search engines
 * will actually show.
 *
 * Product descriptions are rich text (Tiptap), so the raw value contains
 * markup that would otherwise appear literally in a meta description — and
 * `<p>` boundaries carry no space, so tags are replaced with a space rather
 * than removed, to avoid welding "...faith.Each piece..." together.
 *
 * Truncation prefers the last word boundary so the snippet does not end
 * mid-word, and only adds an ellipsis when something was actually cut.
 */
export function toMetaDescription(html: string | null, maxLength = 155): string | null {
  if (!html) return null;

  const text = html
    .replace(/<[^>]*>/g, " ")
    // Entities a rich-text editor commonly emits; left as-is they would show
    // as "&amp;" in the snippet Google displays.
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length === 0) return null;
  if (text.length <= maxLength) return text;

  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Serialize JSON-LD for a <script> tag.
 *
 * `<` is escaped to its unicode form, per the Next.js JSON-LD guide: product
 * names and descriptions are admin-entered, and a `</script>` sequence inside
 * one would otherwise close the tag early and inject markup into the page.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
