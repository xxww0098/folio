import { useEffect, useState } from "react";
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

  useEffect(() => {
    setOrigin(window.location.origin);
    void getEntranceSettings()
      .then((next) => {
        setSettings(next);
        setDraft(next.value);
      })
      .catch(() => setSettings({ enabled: false, value: "" }));
  }, []);

  const path = settings?.value ?? "";
  const href = path && origin ? `${origin}/${path}` : path ? `/${path}` : "";

  async function apply(next: EntranceSettings) {
    setSettings(next);
    setDraft(next.value);
  }

  async function onSave() {
    setBusy("save");
    try {
      await apply(await setEntranceSettings({ data: { value: draft.trim() } }));
      toast.success(draft.trim() ? "入口已更新" : "入口已关闭");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法保存");
    } finally {
      setBusy(null);
    }
  }

  async function onRotate() {
    setBusy("rotate");
    try {
      await apply(await rotateEntrance());
      toast.success("已生成新入口");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法生成");
    } finally {
      setBusy(null);
    }
  }

  async function onDisable() {
    setBusy("off");
    try {
      await apply(await setEntranceSettings({ data: { value: "" } }));
      toast.success("入口已关闭");
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

  return (
    <div className="mt-4 max-w-xl space-y-5">
      <p className="text-sm text-muted-foreground">
        开启后，直接打开 /console 会显示成普通 404。用下面这段路径才能进后台。个人中心 /me 与写文章不受影响。Obsidian 与 Agent 令牌也不拦。
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
          onChange={(event) => setDraft(event.target.value)}
          placeholder="留空即关闭"
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy !== null} onClick={() => void onSave()}>
          {draft.trim() ? "保存" : "关闭"}
        </Button>
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
