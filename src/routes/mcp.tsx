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
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Agent 远程改稿</h1>
        <p className="mt-4 text-base leading-relaxed text-foreground/90">
          用个人令牌连接 `/api/mcp`，列稿、推送、改权限、上传配图。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/console">签发令牌</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/obsidian">Obsidian</Link>
          </Button>
        </div>
      </article>

      <div className="mt-8">
        <McpPanel showTokens />
      </div>
    </SiteShell>
  );
}
