import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listAttachments, uploadAttachment, type AttachmentItem } from "@/lib/attachments/server";
import { Button } from "@/components/ui/button";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>附件库</DialogTitle>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">选择一张图，或上传新的（2 MB 内）。</p>
          <label className="inline-flex h-11 cursor-pointer items-center rounded-md bg-primary px-3 text-sm text-primary-foreground">
            {pending ? "上传中…" : "上传图片"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={pending}
              onChange={(event) => void onFile(event.target.files?.[0])}
            />
          </label>
        </div>
        <ul className="mt-4 grid max-h-80 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full overflow-hidden rounded-lg bg-secondary text-left"
                onClick={() => {
                  onSelect(item);
                  onOpenChange(false);
                }}
              >
                <img src={item.url} alt={item.alt} className="aspect-16/10 w-full object-cover" />
                <span className="block truncate px-2 py-1.5 text-xs">{item.alt || item.filename}</span>
              </button>
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
