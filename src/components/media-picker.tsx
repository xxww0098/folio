import { useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteAttachment, listAttachments, uploadAttachment, type AttachmentItem } from "@/lib/attachments/server";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: AttachmentItem) => void;
}) {
  const [items, setItems] = useState<AttachmentItem[]>([]);
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    void listAttachments()
      .then(setItems)
      .catch(() => setItems([]));
  }, [open]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setPending(true);
    try {
      const dataBase64 = await readAsDataUrl(file);
      const item = await uploadAttachment({
        data: {
          filename: file.name,
          mimeType: file.type,
          dataBase64,
          alt: file.name.replace(/\.[^.]+$/, ""),
        },
      });
      setItems((current) => [item, ...current]);
      toast.success("已上传");
    } catch (error) {
      const message = error instanceof Error ? error.message : "上传失败";
      toast.error(message === "Unauthorized" ? "请先登录" : message);
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: number) {
    setBusyId(id);
    try {
      await deleteAttachment({ data: id });
      setItems((current) => current.filter((item) => item.id !== id));
      toast.success("已删除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法删除");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>附件库</DialogTitle>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">选择一张图，或上传新的（含 GIF，8 MB 内）。未引用的图可以删掉。</p>
          <label className="inline-flex h-11 cursor-pointer items-center rounded-md bg-primary px-3 text-sm text-primary-foreground">
            {pending ? "上传中…" : "上传图片"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,.gif"
              className="hidden"
              disabled={pending}
              onChange={(event) => void onFile(event.target.files?.[0])}
            />
          </label>
        </div>
        <ul className="mt-4 grid max-h-80 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="relative">
              <button
                type="button"
                className="w-full overflow-hidden rounded-lg bg-secondary text-left"
                onClick={() => {
                  onSelect(item);
                  onOpenChange(false);
                }}
              >
                <img src={item.url} alt={item.alt} className="aspect-16/10 w-full object-cover" />
                <span className="block truncate px-2 py-1.5 text-xs">
                  {item.alt || item.filename}
                  {item.stored && !item.referenced ? " · 未引用" : ""}
                </span>
              </button>
              {item.stored && !item.referenced ? (
                <button
                  type="button"
                  className="absolute right-1.5 top-1.5 rounded bg-background/90 px-1.5 py-0.5 text-xs text-muted-foreground hover:text-destructive"
                  disabled={busyId === item.id}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void onDelete(item.id);
                  }}
                >
                  {busyId === item.id ? "…" : "删除"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">还没有附件。</p> : null}
      </DialogContent>
    </Dialog>
  );
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("无法读取文件"));
    reader.readAsDataURL(file);
  });
}