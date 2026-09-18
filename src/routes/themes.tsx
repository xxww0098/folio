import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { ThemeGallery } from "@/components/theme-gallery";
import { getSiteChrome } from "@/lib/blog/server";

export const Route = createFileRoute("/themes")({
  loader: () => getSiteChrome(),
  head: () => ({ meta: [{ title: "主题 - 折页" }] }),
  component: ThemesPage,
});

function ThemesPage() {
  const chrome = Route.useLoaderData();

  return (
    <SiteShell posts={chrome.posts} tags={chrome.tags} recentComments={chrome.recentComments} sidebar>
      <article className="overflow-hidden rounded-xl bg-card p-6 shadow-md sm:p-8">
        <p className="font-mono text-xs text-muted-foreground">Themes</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">内置主题</h1>
        <p className="mt-4 text-base leading-relaxed text-foreground/90">
          折页内置六套皮肤，每套都有浅色和深色。选择会记在这台设备上，下次打开还在。代码块始终用深色语法高亮，不跟皮肤走。
        </p>
        <div className="mt-8">
          <ThemeGallery />
        </div>
      </article>
    </SiteShell>
  );
}
