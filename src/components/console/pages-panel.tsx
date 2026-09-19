import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getFrontPages, setFrontPageVisible } from "@/lib/pages/server";
import { FRONT_PAGE_META, FRONT_PAGES, type FrontPageFlags } from "@/lib/pages/visibility";

export function PagesPanel() {
  const [pages, setPages] = useState<FrontPageFlags | null>(null);

  useEffect(() => {
    void getFrontPages()
      .then(setPages)
      .catch(() => setPages(null));
  }, []);

  async function onToggle(page: keyof FrontPageFlags, visible: boolean) {
    const previous = pages;
    setPages((current) => (current ? { ...current, [page]: visible } : current));
    try {
      const next = await setFrontPageVisible({ data: { page, visible } });
      setPages(next);
    } catch (error) {
      if (previous) setPages(previous);
      toast.error(error instanceof Error ? error.message : "没能保存");
    }
  }

  if (!pages) {
    return <p className="text-sm text-console-muted">读取栏目开关…</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-console-muted">关掉的栏目会从前台导航消失，直接打开链接也是 404。控制台里仍可管理内容。</p>
      <ul className="divide-y divide-console-line overflow-hidden rounded-xl bg-console-sidebar">
        {FRONT_PAGES.map((page) => (
          <li key={page} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-console-ink">{FRONT_PAGE_META[page].label}</p>
              <p className="text-xs text-console-muted">{FRONT_PAGE_META[page].path}</p>
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm text-console-ink">
              <input
                type="checkbox"
                checked={pages[page]}
                onChange={(event) => void onToggle(page, event.target.checked)}
                className="size-4 accent-primary"
              />
              前台显示
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
