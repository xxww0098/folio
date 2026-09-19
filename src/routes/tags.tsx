import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, siteChromeProps } from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { getSiteChrome } from "@/lib/blog/server";

export const Route = createFileRoute("/tags")({
  loader: () => getSiteChrome(),
  head: () => ({ meta: [{ title: "标签 - 折页" }] }),
  component: TagsPage,
});

function TagsPage() {
  const chrome = Route.useLoaderData();
  return (
    <SiteShell {...siteChromeProps(chrome)} sidebar>
      <h1 className="text-2xl font-semibold tracking-tight">标签</h1>
      <p className="mt-2 text-sm text-muted-foreground">从更细的线索进入文章。</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {chrome.tags.map((tag) => (
          <Badge key={tag.slug} asChild variant="secondary" className="h-11 px-4 text-sm shadow-md">
            <Link to="/tags/$tag" params={{ tag: tag.slug }}>
              #{tag.name}
              <span className="ml-1 tabular-nums text-muted-foreground">{tag.count}</span>
            </Link>
          </Badge>
        ))}
      </div>
    </SiteShell>
  );
}
