import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getStorageSettings,
  migrateStorage,
  setStorageSettings,
  testStorageSettings,
  type StoragePublicSettings,
} from "@/lib/storage/server";
import { sweepGhostFiles } from "@/lib/attachments/server";

type Draft = {
  driver: "pg" | "s3";
  endpoint: string;
  bucket: string;
  region: string;
  accessKey: string;
  secretKey: string;
  forcePathStyle: boolean;
  publicBase: string;
  prefix: string;
};

function toDraft(settings: StoragePublicSettings): Draft {
  return {
    driver: settings.driver,
    endpoint: settings.endpoint,
    bucket: settings.bucket,
    region: settings.region,
    accessKey: settings.accessKey,
    secretKey: "",
    forcePathStyle: settings.forcePathStyle,
    publicBase: settings.publicBase,
    prefix: settings.prefix,
  };
}

function payload(draft: Draft) {
  const complete = Boolean(draft.endpoint.trim() && draft.bucket.trim() && draft.accessKey.trim());
  return {
    driver: complete ? ("s3" as const) : ("pg" as const),
    endpoint: draft.endpoint,
    bucket: draft.bucket,
    region: draft.region,
    accessKey: draft.accessKey,
    secretKey: draft.secretKey,
    forcePathStyle: draft.forcePathStyle,
    publicBase: draft.publicBase,
    prefix: draft.prefix,
  };
}

export function StoragePanel() {
  const [settings, setSettings] = useState<StoragePublicSettings | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const skip = useRef(true);

  useEffect(() => {
    void getStorageSettings()
      .then((next) => {
        setSettings(next);
        setDraft(toDraft(next));
        skip.current = true;
      })
      .catch(() => {
        const fallback: StoragePublicSettings = {
          driver: "pg",
          source: "default",
          endpoint: "",
          bucket: "",
          region: "auto",
          accessKey: "",
          secretSet: false,
          forcePathStyle: true,
          publicBase: "",
          prefix: "folio",
          ready: true,
          envComplete: false,
          pgCount: 0,
          s3Count: 0,
        };
        setSettings(fallback);
        setDraft(toDraft(fallback));
        skip.current = true;
      });
  }, []);

  function patch(next: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...next } : current));
    setHint("");
  }

  useEffect(() => {
    if (!draft) return;
    if (skip.current) {
      skip.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      setBusy("save");
      void setStorageSettings({ data: payload(draft) })
        .then((next) => {
          skip.current = true;
          setSettings(next);
          setDraft({ ...toDraft(next), secretKey: "" });
          setHint(next.driver === "s3" ? "图片会写成对象存储地址" : "对象存储还没写完，图片暂存站点");
        })
        .catch(() => {
          setHint("还没写完整，暂不保存");
        })
        .finally(() => setBusy(null));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [draft]);

  async function onTest() {
    if (!draft) return;
    setBusy("test");
    try {
      await testStorageSettings({ data: payload(draft) });
      toast.success("可以读写这个桶");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "连不上");
    } finally {
      setBusy(null);
    }
  }

  async function onMigrate(direction: "to-s3" | "to-pg") {
    setBusy(direction);
    try {
      const next = await migrateStorage({ data: { direction } });
      setSettings(next);
      setDraft((current) => (current ? { ...current, ...toDraft(next), secretKey: current.secretKey } : current));
      toast.success(`已迁出 ${next.moved} 张`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法迁移");
    } finally {
      setBusy(null);
    }
  }

  async function onSweep() {
    setBusy("sweep");
    try {
      const result = await sweepGhostFiles();
      const next = await getStorageSettings();
      setSettings(next);
      if (result.removed && result.objects) {
        toast.success(`已清理 ${result.removed} 张未引用，并去掉桶里 ${result.objects} 个幽灵文件`);
      } else if (result.removed) {
        toast.success(`已清理 ${result.removed} 张未引用图片`);
      } else if (result.objects) {
        toast.success(`已去掉桶里 ${result.objects} 个幽灵文件`);
      } else {
        toast.success("没有幽灵图片");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法清理");
    } finally {
      setBusy(null);
    }
  }

  if (!settings || !draft) {
    return <p className="mt-6 text-sm text-muted-foreground">正在读取存储设置…</p>;
  }

  return (
    <div className="mt-4 max-w-xl space-y-5">
      <p className="text-sm text-muted-foreground">
        只接受图片。配好对象存储后，上传会写成公开 URL，和 Obsidian 同步一样。没配好时暂存在站点里。删除附件或保存文章时，会同时删掉对象存储里的文件，不留没引用的幽灵图。
      </p>
      <p className="text-sm text-muted-foreground">
        {settings.pgCount ? `${settings.pgCount} 张还在站点内` : "站点内没有待迁的图"}
        {settings.s3Count ? `，${settings.s3Count} 张已是对象存储地址` : ""}
        {settings.source === "env" ? "。当前连接信息来自环境变量。" : ""}
      </p>
      <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="s3-endpoint">Endpoint</Label>
            <Input
              id="s3-endpoint"
              value={draft.endpoint}
              onChange={(event) => patch({ endpoint: event.target.value })}
              placeholder="对象存储地址"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="s3-bucket">桶</Label>
              <Input
                id="s3-bucket"
                value={draft.bucket}
                onChange={(event) => patch({ bucket: event.target.value })}
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s3-region">区域</Label>
              <Input
                id="s3-region"
                value={draft.region}
                onChange={(event) => patch({ region: event.target.value })}
                placeholder="区域"
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="s3-ak">Access Key</Label>
              <Input
                id="s3-ak"
                value={draft.accessKey}
                onChange={(event) => patch({ accessKey: event.target.value })}
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s3-sk">Secret Key</Label>
              <Input
                id="s3-sk"
                type="password"
                value={draft.secretKey}
                onChange={(event) => patch({ secretKey: event.target.value })}
                placeholder={settings.secretSet ? "已保存，留空则不改" : ""}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>访问方式</Label>
            <Select
              value={draft.forcePathStyle ? "path" : "virtual"}
              onValueChange={(value) => patch({ forcePathStyle: value === "path" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="path">路径风格（MinIO）</SelectItem>
                <SelectItem value="virtual">虚拟主机（AWS、OSS）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s3-public">公开前缀（可选）</Label>
            <Input
              id="s3-public"
              value={draft.publicBase}
              onChange={(event) => patch({ publicBase: event.target.value })}
              placeholder="公开访问地址"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s3-prefix">对象前缀</Label>
            <Input
              id="s3-prefix"
              value={draft.prefix}
              onChange={(event) => patch({ prefix: event.target.value })}
              placeholder="目录名"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
            />
          </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">{busy === "save" ? "正在保存…" : hint || "改完会自动保存"}</p>
        <Button variant="outline" disabled={busy !== null} onClick={() => void onTest()}>
          {busy === "test" ? "测试中…" : "测试"}
        </Button>
        <Button variant="outline" disabled={busy !== null} onClick={() => void onSweep()}>
          {busy === "sweep" ? "清理中…" : "清理幽灵图片"}
        </Button>
      </div>
      {settings.pgCount > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy !== null} onClick={() => void onMigrate("to-s3")}>
            {busy === "to-s3" ? "迁移中…" : `把 ${settings.pgCount} 张转成对象存储地址`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
