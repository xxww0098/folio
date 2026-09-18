import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { getSiteChrome } from "@/lib/blog/server";

export const Route = createFileRoute("/tags")({
  loader: () => getSiteChrome(),
  head: () => ({ meta: [{ title: "标签 - 折页" }] }),
  component: TagsPage,
});

function TagsPage() {
  const chrome = Route.useLoaderData();
  return (
    <SiteShell posts={chrome.posts} tags={chrome.tags} recentComments={chrome.recentComments} sidebar>
      <h1 className="text-2xl font-semibold tracking-tight">标签</h1>
      <p className="mt-2 text-sm text-muted-foreground">从更细的线索进入文章。</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {chrome.tags.map((tag) => (
          <Link
            key={tag.slug}
            to="/tags/$tag"
            params={{ tag: tag.slug }}
            className="inline-flex h-11 items-center rounded-full bg-card px-4 text-sm shadow-md hover:text-primary"
          >
            #{tag.name}
            <span className="ml-2 tabular-nums text-muted-foreground">{tag.count}</span>
          </Link>
        ))}
      </div>
    </SiteShell>
  );
}
