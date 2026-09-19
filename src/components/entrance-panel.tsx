import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getEntranceSettings,
  rotateEntrance,
  setEntranceSettings,
  type EntranceSettings,
} from "@/lib/entrance/server";

export function EntrancePanel() {
  const [settings, setSettings] = useState<EntranceSettings | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [hint, setHint] = useState("");
  const skip = useRef(true);

  useEffect(() => {
    setOrigin(window.location.origin);
    void getEntranceSettings()
      .then((next) => {
        setSettings(next);
        setDraft(next.value);
        skip.current = true;
      })
      .catch(() => setSettings({ enabled: false, value: "" }));
  }, []);

  async function apply(next: EntranceSettings) {
    setSettings(next);
    setDraft(next.value);
  }

  useEffect(() => {
    if (!settings) return;
    if (skip.current) {
      skip.current = false;
      return;
    }
    const value = draft.trim();
    if (value === settings.value) return;
    const timer = window.setTimeout(() => {
      setBusy("save");
      void setEntranceSettings({ data: { value } })
        .then((next) => {
          skip.current = true;
          void apply(next);
          setHint(value ? "入口已更新" : "入口已关闭");
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : "无法保存");
        })
        .finally(() => setBusy(null));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draft, settings]);

  async function onRotate() {
    setBusy("rotate");
    try {
      skip.current = true;
      await apply(await rotateEntrance());
      setHint("已生成新入口");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法生成");
    } finally {
      setBusy(null);
    }
  }

  async function onDisable() {
    setBusy("off");
    try {
      skip.current = true;
      await apply(await setEntranceSettings({ data: { value: "" } }));
      setHint("入口已关闭");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法关闭");
    } finally {
      setBusy(null);
    }
  }

  async function onCopy() {
    if (!href) return;
    try {
      await navigator.clipboard.writeText(href);
      toast.success("已复制");
    } catch {
      toast.error("无法复制");
    }
  }

  if (!settings) {
    return <p className="mt-6 text-sm text-muted-foreground">正在读取入口设置…</p>;
  }

  const path = settings.value;
  const href = path && origin ? `${origin}/${path}` : path ? `/${path}` : "";

  return (
    <div className="mt-4 max-w-xl space-y-5">
      <p className="text-sm text-muted-foreground">
        开启后，直接打开 /console 会显示成普通 404。用下面这段路径才能进后台。个人中心 /me 与写文章不受影响。Obsidian 与 Agent 令牌也不拦。改完自动保存。
      </p>
      {settings.enabled && href ? (
        <div className="rounded-xl bg-card px-5 py-4 shadow-md">
          <p className="text-xs text-muted-foreground">当前入口</p>
          <p className="mt-2 break-all font-mono text-sm">{href}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void onCopy()}>
              复制
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={href}>打开</a>
            </Button>
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="entrance-path">路径</Label>
        <Input
          id="entrance-path"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setHint("");
          }}
          placeholder="留空即关闭"
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">{busy === "save" ? "正在保存…" : hint || "改完会自动保存"}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy !== null} onClick={() => void onRotate()}>
          生成
        </Button>
        {settings.enabled ? (
          <Button variant="ghost" disabled={busy !== null} onClick={() => void onDisable()}>
            关闭
          </Button>
        ) : null}
      </div>
    </div>
  );
}
