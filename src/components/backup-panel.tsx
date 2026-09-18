import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportSnapshot, importSnapshot } from "@/lib/backup/server";

function stamp(iso: string) {
  const raw = iso || new Date().toISOString();
  return raw.slice(0, 10);
}

function downloadJson(filename: string, json: string) {
  const blob = new Blob([json], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

export function BackupPanel() {
  const [busy, setBusy] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onExport() {
    setBusy("export");
    try {
      const { json } = await exportSnapshot();
      const parsed = JSON.parse(json) as { exportedAt?: string; tables?: { posts?: unknown[] } };
      downloadJson(`folio-${stamp(parsed.exportedAt ?? "")}.json`, json);
      toast.success(`已下载，内含 ${parsed.tables?.posts?.length ?? 0} 篇文章`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法导出");
    } finally {
      setBusy(null);
    }
  }

  async function onPick(file: File | undefined) {
    if (!file) return;
    const json = await file.text();
    try {
      JSON.parse(json);
    } catch {
      toast.error("文件不是 JSON");
      return;
    }
    if (!window.confirm("导入会覆盖当前站点的全部内容，且不可撤销。确定继续？")) return;
    setBusy("import");
    try {
      const result = await importSnapshot({ data: { json } });
      toast.success(`已导入 ${result.posts} 篇文章。请重新登录。`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法导入");
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-6 max-w-xl space-y-6">
      <p className="text-sm leading-relaxed text-muted-foreground">
        把整站（文章、附件、账户、入口）收成一个文件，换机器时再导回来。会话不会跟着走，导入后重新登录。
      </p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy !== null} onClick={() => void onExport()}>
          {busy === "export" ? "导出中…" : "导出"}
        </Button>
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={() => inputRef.current?.click()}
        >
          {busy === "import" ? "导入中…" : "导入"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void onPick(event.target.files?.[0])}
        />
      </div>
    </div>
  );
}
