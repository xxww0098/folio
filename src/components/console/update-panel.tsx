import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getAutoUpdate, setAutoUpdate, type UpdateStatus } from "@/lib/updates/server";
import { GITHUB_RELEASES_URL } from "@/lib/release";
import { Checkbox } from "@/components/ui/checkbox";

export function UpdatePanel() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    void getAutoUpdate()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    if (!status?.enabled) return;
    const timer = window.setInterval(() => {
      void getAutoUpdate().then(setStatus).catch(() => undefined);
    }, 30 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [status?.enabled]);

  async function onToggle(enabled: boolean) {
    const previous = status;
    if (status) setStatus({ ...status, enabled });
    try {
      setStatus(await setAutoUpdate({ data: { enabled } }));
    } catch (error) {
      if (previous) setStatus(previous);
      toast.error(error instanceof Error ? error.message : "没能保存");
    }
  }

  if (!status) {
    return <p className="text-sm text-console-muted">读取更新设置…</p>;
  }

  return (
    <div className="max-w-xl space-y-4">
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-console-sidebar px-4 py-3">
        <Checkbox
          checked={status.enabled}
          onCheckedChange={(value) => void onToggle(value === true)}
          className="mt-0.5"
        />
        <span>
          <span className="text-sm font-medium text-console-ink">自动更新</span>
          <p className="mt-1 text-xs leading-relaxed text-console-muted">
            开启后会定期检查 GitHub Release。发现新版本时，自托管请执行{" "}
            <span className="font-mono">./scripts/update-from-release.sh</span>
          </p>
        </span>
      </label>
      <p className="text-sm text-console-muted">
        当前 <span className="font-mono">v{status.current}</span>
        {status.newer && status.latest ? (
          <>
            {" "}
            · 新版本{" "}
            <a href={status.url || GITHUB_RELEASES_URL} className="font-mono text-primary hover:underline" target="_blank" rel="noreferrer">
              {status.latest}
            </a>
            {status.enabled ? "，已开启自动检查" : ""}
          </>
        ) : status.latest ? (
          <> · 已是最新 Release</>
        ) : null}
      </p>
    </div>
  );
}
