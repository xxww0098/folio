import { createFileRoute, Link } from "@tanstack/react-router";
import { ArticleCard } from "@/components/article-card";
import { PAGE_SIZE, PageNav } from "@/components/page-nav";
import { SiteShell } from "@/components/site-shell";
import { getSiteChrome } from "@/lib/blog/server";
import { TOPICS } from "@/lib/blog/types";

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
  const { posts, tags, recentComments } = Route.useLoaderData();
  const page = Route.useSearch().page ?? 1;
  const start = (page - 1) * PAGE_SIZE;
  const slice = posts.slice(start, start + PAGE_SIZE);

  return (
    <SiteShell posts={posts} tags={tags} recentComments={recentComments} sidebar>
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex h-9 items-center rounded-full bg-card px-3 text-sm font-medium shadow-md">
          全部
        </span>
        {TOPICS.map((topic) => (
          <Link
            key={topic}
            to="/topics/$topic"
            params={{ topic }}
            className="inline-flex h-9 items-center rounded-full bg-card px-3 font-mono text-xs text-muted-foreground shadow-md hover:text-foreground"
          >
            {topic}
          </Link>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6">
        {slice.map((post) => (
          <ArticleCard key={post.id} post={post} />
        ))}
      </div>
      <PageNav page={page} total={posts.length} to="/" />
    </SiteShell>
  );
}
