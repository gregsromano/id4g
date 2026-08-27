"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { useState } from "react";

import { RICH_TEXT_CLASSES } from "@/lib/rich-text";

const SWATCHES = ["#f5c542", "#e04b4b", "#4b8ce0", "#4be08a", "#ffffff", "#9a9a9a"];

/**
 * Rich-text description editor. Output is saved as HTML (via a hidden input
 * kept in sync with the editor's content) and rendered later with
 * dangerouslySetInnerHTML — safe here because the only writer is this
 * editor, gated behind admin auth; nothing else can populate this field.
 */
export default function RichTextEditor({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const [html, setHtml] = useState(defaultValue ?? "");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
    ],
    content: defaultValue ?? "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    editorProps: {
      attributes: {
        class: `min-h-[160px] px-3 py-2 text-sm text-[var(--text-primary)] outline-none ${RICH_TEXT_CLASSES}`,
      },
    },
  });

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-section-alt)]">
      <Toolbar editor={editor} />
      <input type="hidden" name={name} value={html} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const [showColors, setShowColors] = useState(false);

  if (!editor) {
    return <div className="h-10 border-b border-[var(--border)]" />;
  }

  function setLink() {
    const previous = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="relative flex flex-wrap items-center gap-1 border-b border-[var(--border)] p-1">
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Bold"
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Italic"
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        label="Underline"
      >
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        label="Strikethrough"
      >
        <span className="line-through">S</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        label="Heading"
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        label="Bullet list"
      >
        &bull; List
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        label="Numbered list"
      >
        1. List
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        label="Quote"
      >
        &ldquo;&rdquo;
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        label="Align left"
      >
        &#8676;
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        label="Align center"
      >
        &#8596;
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        label="Align right"
      >
        &#8677;
      </ToolbarButton>

      <Divider />

      <ToolbarButton active={editor.isActive("link")} onClick={setLink} label="Link">
        &#128279;
      </ToolbarButton>
      <ToolbarButton
        active={showColors}
        onClick={() => setShowColors((v) => !v)}
        label="Text color"
      >
        <span style={{ color: "var(--accent)" }}>A</span>
      </ToolbarButton>

      {showColors && (
        <div className="absolute left-0 top-full z-10 mt-1 flex gap-1 border border-[var(--border)] bg-[var(--bg-primary)] p-2">
          {SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              onClick={() => {
                editor.chain().focus().setColor(color).run();
                setShowColors(false);
              }}
              className="h-6 w-6 border border-[var(--border)]"
              style={{ backgroundColor: color }}
            />
          ))}
          <button
            type="button"
            title="Reset color"
            onClick={() => {
              editor.chain().focus().unsetColor().run();
              setShowColors(false);
            }}
            className="px-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent)]"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center px-2 text-xs transition-colors ${
        active
          ? "bg-[var(--accent)] text-[var(--on-accent)]"
          : "text-[var(--text-body)] hover:bg-[var(--bg-primary)]"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px bg-[var(--border)]" aria-hidden />;
}
