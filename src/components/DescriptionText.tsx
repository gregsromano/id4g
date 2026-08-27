import { RICH_TEXT_CLASSES } from "@/lib/rich-text";

/**
 * Renders a product description saved as HTML by the admin's rich-text
 * editor (src/components/admin/RichTextEditor.tsx). Safe to render directly
 * — the only writer of this field is that editor, gated behind admin auth;
 * nothing user-facing ever populates it.
 */
export default function DescriptionText({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={`${RICH_TEXT_CLASSES} ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
