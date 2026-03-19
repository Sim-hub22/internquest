"use client";

import { useEffect, useReducer, useState } from "react";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import {
  BoldIcon,
  Code2Icon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  ItalicIcon,
  Link2Icon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from "lucide-react";

import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

const lowlight = createLowlight(common);

type RichTextEditorProps = {
  value: string;
  onChangeAction: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaInvalid?: boolean;
  mode?: "default" | "blog";
  onImageUploadAction?: () => Promise<string | null>;
};

export function RichTextEditor({
  value,
  onChangeAction,
  placeholder,
  className,
  ariaInvalid = false,
  mode = "default",
  onImageUploadAction,
}: RichTextEditorProps) {
  const [, forceToolbarUpdate] = useReducer((count: number) => count + 1, 0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const isBlogEditor = mode === "blog";

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Image,
      Link.configure({
        openOnClick: true,
        autolink: true,
      }),
      ...(isBlogEditor
        ? [
            Underline,
            CodeBlockLowlight.configure({
              lowlight,
            }),
          ]
        : []),
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
          "prose prose-sm min-h-56 max-w-none px-4 py-3 outline-none prose-img:rounded-2xl prose-pre:rounded-2xl prose-pre:border prose-pre:border-slate-800 prose-pre:bg-slate-950 prose-pre:text-slate-50 dark:prose-invert",
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
    if (onImageUploadAction) {
      setIsUploadingImage(true);
      void onImageUploadAction()
        .then((url) => {
          if (!url) {
            return;
          }

          editor.chain().focus().setImage({ src: url }).run();
        })
        .finally(() => setIsUploadingImage(false));
      return;
    }

    const url = window.prompt("Enter image URL", "https://");
    if (!url) {
      return;
    }
    editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div
      aria-invalid={ariaInvalid || undefined}
      className={cn(
        "overflow-hidden rounded-lg border border-input aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
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
        {isBlogEditor ? (
          <>
            <Toggle
              type="button"
              size="sm"
              pressed={editor.isActive("underline")}
              variant={editor.isActive("underline") ? "outline" : "default"}
              onPressedChange={() =>
                editor.chain().focus().toggleUnderline().run()
              }
            >
              <UnderlineIcon />
              <span className="sr-only">Underline</span>
            </Toggle>
            <Toggle
              type="button"
              size="sm"
              pressed={editor.isActive("strike")}
              variant={editor.isActive("strike") ? "outline" : "default"}
              onPressedChange={() =>
                editor.chain().focus().toggleStrike().run()
              }
            >
              <StrikethroughIcon />
              <span className="sr-only">Strikethrough</span>
            </Toggle>
          </>
        ) : null}
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
        {isBlogEditor ? (
          <Toggle
            type="button"
            size="sm"
            pressed={editor.isActive("codeBlock")}
            variant={editor.isActive("codeBlock") ? "outline" : "default"}
            onPressedChange={() =>
              editor.chain().focus().toggleCodeBlock().run()
            }
          >
            <Code2Icon />
            <span className="sr-only">Code block</span>
          </Toggle>
        ) : null}
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
          disabled={isUploadingImage}
          onPressedChange={addImage}
        >
          <ImageIcon />
          <span className="sr-only">
            {isUploadingImage ? "Uploading image" : "Image"}
          </span>
        </Toggle>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
