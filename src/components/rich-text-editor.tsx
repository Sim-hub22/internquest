"use client";

import { useEffect, useReducer } from "react";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  BoldIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  ItalicIcon,
  Link2Icon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
} from "lucide-react";

import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChangeAction: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function RichTextEditor({
  value,
  onChangeAction,
  placeholder,
  className,
}: RichTextEditorProps) {
  const [, forceToolbarUpdate] = useReducer((count: number) => count + 1, 0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: true,
        autolink: true,
      }),
      Placeholder.configure({
        placeholder:
          placeholder ??
          "Describe the role, responsibilities, and what makes this internship great.",
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm min-h-56 max-w-none px-4 py-3 outline-none dark:prose-invert",
      },
    },
    onTransaction: () => {
      forceToolbarUpdate();
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChangeAction(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    // `content` is only applied on init; keep editor in sync with form resets.
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL", previousUrl ?? "https://");

    if (url === null) {
      return;
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt("Enter image URL", "https://");
    if (!url) {
      return;
    }
    editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-input",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-2">
        <Toggle
          type="button"
          size="sm"
          pressed={editor.isActive("bold")}
          variant={editor.isActive("bold") ? "outline" : "default"}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
        >
          <BoldIcon />
          <span className="sr-only">Bold</span>
        </Toggle>
        <Toggle
          type="button"
          size="sm"
          pressed={editor.isActive("italic")}
          variant={editor.isActive("italic") ? "outline" : "default"}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon />
          <span className="sr-only">Italic</span>
        </Toggle>
        <Toggle
          type="button"
          size="sm"
          pressed={editor.isActive("heading", { level: 1 })}
          variant={
            editor.isActive("heading", { level: 1 }) ? "outline" : "default"
          }
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1Icon />
          <span className="sr-only">Heading 1</span>
        </Toggle>
        <Toggle
          type="button"
          size="sm"
          pressed={editor.isActive("heading", { level: 2 })}
          variant={
            editor.isActive("heading", { level: 2 }) ? "outline" : "default"
          }
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2Icon />
          <span className="sr-only">Heading 2</span>
        </Toggle>
        <Toggle
          type="button"
          size="sm"
          pressed={editor.isActive("heading", { level: 3 })}
          variant={
            editor.isActive("heading", { level: 3 }) ? "outline" : "default"
          }
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3Icon />
          <span className="sr-only">Heading 3</span>
        </Toggle>
        <Toggle
          type="button"
          size="sm"
          pressed={editor.isActive("bulletList")}
          variant={editor.isActive("bulletList") ? "outline" : "default"}
          onPressedChange={() =>
            editor.chain().focus().toggleBulletList().run()
          }
        >
          <ListIcon />
          <span className="sr-only">Bullet list</span>
        </Toggle>
        <Toggle
          type="button"
          size="sm"
          pressed={editor.isActive("orderedList")}
          variant={editor.isActive("orderedList") ? "outline" : "default"}
          onPressedChange={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
        >
          <ListOrderedIcon />
          <span className="sr-only">Ordered list</span>
        </Toggle>
        <Toggle
          type="button"
          size="sm"
          pressed={editor.isActive("blockquote")}
          variant={editor.isActive("blockquote") ? "outline" : "default"}
          onPressedChange={() =>
            editor.chain().focus().toggleBlockquote().run()
          }
        >
          <QuoteIcon />
          <span className="sr-only">Quote</span>
        </Toggle>
        <Toggle
          type="button"
          size="sm"
          pressed={editor.isActive("link")}
          variant={editor.isActive("link") ? "outline" : "default"}
          onPressedChange={addLink}
        >
          <Link2Icon />
          <span className="sr-only">Link</span>
        </Toggle>
        <Toggle
          type="button"
          size="sm"
          pressed={false}
          onPressedChange={addImage}
        >
          <ImageIcon />
          <span className="sr-only">Image</span>
        </Toggle>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
