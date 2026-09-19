import { useEffect, useState, type MouseEvent } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { toast } from "sonner";
import { publishAttachmentUrl } from "@/lib/attachments/server";
import { cn } from "@/lib/utils";

function fileIdFromSrc(src: string) {
  const raw = src.trim();
  if (!raw) return null;
  let path = raw;
  try {
    if (/^https?:\/\//i.test(raw)) path = new URL(raw).pathname;
  } catch {
    /* keep raw */
  }
  const match = /\/api\/files\/(\d+)(?:\/|$)/.exec(path);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function EditorImageView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const src = String(node.attrs.src ?? "");
  const alt = String(node.attrs.alt ?? "");
  const canPublish = fileIdFromSrc(src) !== null;
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!menu) return;
    function close() {
      setMenu(null);
    }
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  async function toObjectUrl() {
    if (busy) return;
    setBusy(true);
    setMenu(null);
    try {
      const result = await publishAttachmentUrl({ data: { src } });
      updateAttributes({ src: result.url });
      toast.success("已写成对象存储地址");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法转换");
    } finally {
      setBusy(false);
    }
  }

  async function copySrc() {
    setMenu(null);
    if (!src) return;
    try {
      await navigator.clipboard.writeText(src);
      toast.success("已复制地址");
    } catch {
      toast.error("无法复制");
    }
  }

  return (
    <NodeViewWrapper
      className={cn("folio-editor-image", selected && "is-selected")}
      data-drag-handle=""
      onContextMenu={(event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setMenu({ x: event.clientX, y: event.clientY });
      }}
    >
      <img src={src} alt={alt} draggable={false} />
      {canPublish ? (
        <button
          type="button"
          className="folio-editor-image-action"
          disabled={busy}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void toObjectUrl();
          }}
        >
          {busy ? "转换中…" : "转成对象地址"}
        </button>
      ) : null}
      {menu ? (
        <div
          className="folio-editor-image-menu"
          style={{ top: menu.y, left: menu.x }}
          onClick={(event) => event.stopPropagation()}
        >
          {canPublish ? (
            <button type="button" disabled={busy} onClick={() => void toObjectUrl()}>
              {busy ? "转换中…" : "转成对象存储地址"}
            </button>
          ) : (
            <p>已是对象地址</p>
          )}
          <button type="button" onClick={() => void copySrc()}>
            复制地址
          </button>
          <button
            type="button"
            onClick={() => {
              setMenu(null);
              deleteNode();
            }}
          >
            从正文移除
          </button>
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}
