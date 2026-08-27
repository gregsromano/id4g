/**
 * Renders a plain-text product description with basic formatting:
 *  - A blank line starts a new paragraph.
 *  - A single line break within a paragraph becomes a line break.
 *  - **text** becomes bold.
 * No markdown library — the admin's description field is a plain textarea,
 * not a rich-text editor, so this is a small, predictable subset rather than
 * full markdown.
 */
export default function DescriptionText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  return (
    <div className={className}>
      {paragraphs.map((paragraph, pIndex) => (
        <p key={pIndex} className={pIndex > 0 ? "mt-4" : undefined}>
          {paragraph.split("\n").map((line, lIndex, lines) => (
            <span key={lIndex}>
              {renderBold(line)}
              {lIndex < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

function renderBold(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
