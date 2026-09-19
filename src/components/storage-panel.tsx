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
  return {
    driver: draft.driver,
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
          setHint(next.driver === "s3" ? "新上传将写入对象存储" : "新上传将写入数据库");
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
      toast.success(direction === "to-s3" ? `已迁出 ${next.moved} 张` : `已收回 ${next.moved} 张`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法迁移");
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
        默认把图片写进数据库，换机器时跟着备份走。图多了可以改成 S3 兼容的对象存储（R2 / MinIO / 阿里云 OSS）。文章里的地址不变。改完自动保存。
      </p>
      <p className="text-sm text-muted-foreground">
        {settings.pgCount} 张在数据库
        {settings.s3Count ? `，${settings.s3Count} 张在对象存储` : ""}
        {settings.source === "env" ? "。当前连接信息来自环境变量。" : ""}
      </p>
      <div className="space-y-2">
        <Label>新上传存到</Label>
        <Select value={draft.driver} onValueChange={(value) => patch({ driver: value as Draft["driver"] })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pg">数据库</SelectItem>
            <SelectItem value="s3">对象存储</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {draft.driver === "s3" ? (
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
      ) : settings.s3Count > 0 ? (
        <p className="text-sm text-muted-foreground">
          还有 {settings.s3Count} 张图在对象存储。删桶之前先收回数据库。
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">{busy === "save" ? "正在保存…" : hint || "改完会自动保存"}</p>
        {draft.driver === "s3" ? (
          <Button variant="outline" disabled={busy !== null} onClick={() => void onTest()}>
            {busy === "test" ? "测试中…" : "测试"}
          </Button>
        ) : null}
      </div>
      {settings.pgCount > 0 || settings.s3Count > 0 ? (
        <div className="flex flex-wrap gap-2">
          {settings.pgCount > 0 ? (
            <Button variant="outline" disabled={busy !== null} onClick={() => void onMigrate("to-s3")}>
              {busy === "to-s3" ? "迁移中…" : `把 ${settings.pgCount} 张迁到对象存储`}
            </Button>
          ) : null}
          {settings.s3Count > 0 ? (
            <Button variant="ghost" disabled={busy !== null} onClick={() => void onMigrate("to-pg")}>
              {busy === "to-pg" ? "迁移中…" : `把 ${settings.s3Count} 张收回数据库`}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
