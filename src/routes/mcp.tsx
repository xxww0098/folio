import { createFileRoute, Link } from "@tanstack/react-router";
import { McpPanel } from "@/components/mcp-panel";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { getSiteChrome } from "@/lib/blog/server";

export const Route = createFileRoute("/mcp")({
  loader: () => getSiteChrome(),
  head: () => ({ meta: [{ title: "Agent - 折页" }] }),
  component: McpGuidePage,
});

function McpGuidePage() {
  const chrome = Route.useLoaderData();

  return (
    <SiteShell posts={chrome.posts} tags={chrome.tags} recentComments={chrome.recentComments} sidebar>
      <article className="overflow-hidden rounded-xl bg-card p-6 shadow-md sm:p-8">
        <p className="font-mono text-xs text-muted-foreground">MCP</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">让 Agent 远程管理折页</h1>
        <p className="mt-4 text-base leading-relaxed text-foreground/90">
          折页对外提供一套 JSON-RPC 接口。本地或云端的写作 Agent 用个人令牌连上之后，可以列文章、拉 Markdown、推送新稿、改栏目和阅读权限、把稿件放进回收站，并上传配图。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/console">去控制台签发令牌</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/obsidian">Obsidian 同步</Link>
          </Button>
        </div>
      </article>

      <div className="mt-8">
        <McpPanel showTokens />
      </div>
    </SiteShell>
  );
}
