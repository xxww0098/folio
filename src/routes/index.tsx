import { createFileRoute, Link } from "@tanstack/react-router";
import { PAGE_SIZE, PageNav } from "@/components/page-nav";
import { PostFeed } from "@/components/post-feed";
import { SiteShell, siteChromeProps } from "@/components/site-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getSiteChrome } from "@/lib/blog/server";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { page?: number } => {
    const n = Number(search.page);
    if (Number.isFinite(n) && n > 1) return { page: Math.floor(n) };
    return {};
  },
  loader: () => getSiteChrome(),
  component: Home,
});

function Home() {
  const chrome = Route.useLoaderData();
  const { posts, topics } = chrome;
  const page = Route.useSearch().page ?? 1;
  const start = (page - 1) * PAGE_SIZE;
  const slice = posts.slice(start, start + PAGE_SIZE);

  return (
    <SiteShell {...siteChromeProps(chrome)} sidebar>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        <Badge variant="default" className="h-9 shrink-0 px-3 text-sm">
          全部
        </Badge>
        {topics.map((topic) => (
          <Badge key={topic} asChild variant="secondary" className="h-9 shrink-0 px-3 font-mono shadow-md">
            <Link to="/topics/$topic" params={{ topic }}>
              {topic}
            </Link>
          </Badge>
        ))}
      </div>
      <div className="folio-flow mt-6">
        <PostFeed posts={slice} />
        {slice.length === 0 ? (
          <Alert variant="muted">
            <AlertDescription>还没有文章。</AlertDescription>
          </Alert>
        ) : null}
      </div>
      <PageNav page={page} total={posts.length} to="/" />
    </SiteShell>
  );
}
