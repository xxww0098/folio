import { useEffect, useRef, useState } from "react";
import { EditorContent, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import {
  Bold,
  CodeXml,
  GitFork,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  Quote,
} from "lucide-react";
import { htmlToMarkdown, markdownToHtml } from "@/lib/blog/html";
import { markdownEditorExtension, type WikiTrigger } from "@/lib/blog/markdown-editor";
import { VideoEmbedNode } from "@/lib/blog/video-node";
import { parseWikiInner, resolveWikiTarget, wikiDisplay, type WikiCatalogItem } from "@/lib/blog/wikilink";
import { WikiSuggestMenu } from "@/components/wiki-suggest-menu";
import { Button } from "@/components/ui/button";
import { EditorImageView } from "@/components/editor-image";
import { uploadAttachment } from "@/lib/attachments/server";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EditorImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(EditorImageView);
  },
});

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(gif|png|jpe?g|webp)$/i.test(file.name);
}

function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("读取失败"));
    reader.readAsDataURL(file);
  });
}

async function uploadEditorImage(file: File) {
  const dataBase64 = await readDataUrl(file);
  return uploadAttachment({
    data: {
      filename: file.name || "image.gif",
      mimeType: file.type || undefined,
      dataBase64,
      alt: file.name.replace(/\.[^.]+$/, "") || "图片",
    },
  });
}

export function VisualEditor({
  value,
  onChange,
  onRequestImage,
  catalog = [],
  fill = false,
}: {
  value: string;
  onChange: (markdown: string) => void;
  onRequestImage?: () => void;
  catalog?: WikiCatalogItem[];
  fill?: boolean;
}) {
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const triggerCb = useRef<(next: WikiTrigger | null) => void>(() => undefined);
  const [trigger, setTrigger] = useState<WikiTrigger | null>(null);
  triggerCb.current = setTrigger;
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { languageClassPrefix: "language-" },
      }),
      EditorImage.configure({ inline: false, allowBase64: false }),
      VideoEmbedNode,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({
        placeholder: "开始写正文",
      }),
      markdownEditorExtension(catalogRef, triggerCb),
    ],
    content: markdownToHtml(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn("tiptap px-1 py-4 text-lg leading-relaxed outline-none", fill ? "min-h-[calc(100dvh-10rem)]" : "min-h-80 px-4 py-3 text-base"),
      },
      handlePaste(_view, event) {
        const current = editorRef.current;
        const file = [...(event.clipboardData?.files ?? [])].find(isImageFile);
        if (!file || !current) return false;
        event.preventDefault();
        void uploadEditorImage(file)
          .then((item) => {
            current.chain().focus().setImage({ src: item.url, alt: item.alt || item.filename }).run();
          })
          .catch((error: unknown) => {
            toast.error(error instanceof Error ? error.message : "图片上传失败");
          });
        return true;
      },
      handleDrop(_view, event) {
        const current = editorRef.current;
        const file = [...(event.dataTransfer?.files ?? [])].find(isImageFile);
        if (!file || !current) return false;
        event.preventDefault();
        void uploadEditorImage(file)
          .then((item) => {
            current.chain().focus().setImage({ src: item.url, alt: item.alt || item.filename }).run();
          })
          .catch((error: unknown) => {
            toast.error(error instanceof Error ? error.message : "图片上传失败");
          });
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(htmlToMarkdown(current.getHTML()));
    },
  });
  editorRef.current = editor;

  useEffect(() => {
    if (!editor) return;
    const current = htmlToMarkdown(editor.getHTML());
    if (current.trim() === value.trim()) return;
    editor.commands.setContent(markdownToHtml(value), { emitUpdate: false });
  }, [editor, value]);

  function insertCode() {
    if (!editor) return;
    if (editor.isActive("codeBlock")) {
      editor.chain().focus().toggleCodeBlock().run();
      return;
    }
    const lang = window.prompt("代码语言", "ts");
    if (lang === null) return;
    editor.chain().focus().toggleCodeBlock({ language: lang.trim() || "text" }).run();
  }

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const next = window.prompt("链接地址", previous ?? "https://");
    if (next === null) return;
    const href = next.trim();
    if (!href) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  function insertWikiToken(inner: string, range?: { from: number; to: number }) {
    if (!editor) return;
    const catalogNow = catalogRef.current;
    const link = parseWikiInner(inner);
    const note = link.target ? resolveWikiTarget(link.target, catalogNow) : undefined;
    const href = note
      ? `/posts/${note.slug}`
      : link.target
        ? `/posts/${link.target}`
        : link.heading
          ? `#${link.heading}`
          : "#";
    const label = wikiDisplay(link) || note?.title || inner;
    const wiki = inner.replace(/&/g, "\u0026amp;").replace(/"/g, "\u0026quot;").replace(/</g, "\u0026lt;");
    const text = label.replace(/&/g, "\u0026amp;").replace(/</g, "\u0026lt;");
    const chain = editor.chain().focus();
    if (range) chain.deleteRange(range);
    chain.insertContent(`<a href="${href}" data-wiki="${wiki}">${text}</a>`).run();
    setTrigger(null);
  }

  function insertWiki() {
    if (!editor) return;
    editor.chain().focus().insertContent("[[").run();
  }

  if (!editor) {
    return <div className="px-1 py-10 text-sm text-console-muted">加载编辑器…</div>;
  }

  return (
    <div className={cn("flex flex-col", fill ? "min-h-0" : "overflow-hidden rounded-lg bg-card shadow-[var(--shadow-border)]")}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1",
          fill
            ? "sticky top-0 z-10 -mx-1 border-b border-console-line bg-console-sidebar/95 px-1 py-1.5 backdrop-blur"
            : "border-b border-border px-2 py-1.5",
        )}
      >
        <Tool active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="一级标题">
          <Heading1 className="size-4" />
        </Tool>
        <Tool active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="二级标题">
          <Heading2 className="size-4" />
        </Tool>
        <Tool active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="三级标题">
          <Heading3 className="size-4" />
        </Tool>
        <Tool active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="加粗">
          <Bold className="size-4" />
        </Tool>
        <Tool active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="斜体">
          <Italic className="size-4" />
        </Tool>
        <Tool active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="引用">
          <Quote className="size-4" />
        </Tool>
        <Tool active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="列表">
          <List className="size-4" />
        </Tool>
        <Tool active={editor.isActive("codeBlock")} onClick={insertCode} label="代码块">
          <CodeXml className="size-4" />
        </Tool>
        <Tool active={editor.isActive("link")} onClick={setLink} label="链接">
          <Link2 className="size-4" />
        </Tool>
        <Tool onClick={insertWiki} label="插入双链">
          <GitFork className="size-4" />
        </Tool>
        {onRequestImage ? (
          <Tool onClick={onRequestImage} label="插入图片">
            <ImageIcon className="size-4" />
          </Tool>
        ) : null}
      </div>
      <div className="relative">
        <EditorContent editor={editor} />
        {trigger ? (
          <div className="absolute left-0 right-0 z-20 mt-1 max-w-md px-1">
            <WikiSuggestMenu
              query={trigger.query}
              catalog={catalog}
              onPick={(hit) => insertWikiToken(hit.inner, trigger)}
              onClose={() => setTrigger(null)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Tool({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={label}
      onClick={onClick}
      className={cn("size-9", active && "bg-secondary text-foreground")}
    >
      {children}
    </Button>
  );
}
