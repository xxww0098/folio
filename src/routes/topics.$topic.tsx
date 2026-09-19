import { createFileRoute, Link } from "@tanstack/react-router";
import { ArticleCard } from "@/components/article-card";
import { SiteShell, siteChromeProps } from "@/components/site-shell";
import { getSiteChrome, listPostsByTopic } from "@/lib/blog/server";
import { TOPICS } from "@/lib/blog/types";

export const Route = createFileRoute("/topics/$topic")({
  loader: async ({ params }) => {
    const [posts, chrome] = await Promise.all([
      listPostsByTopic({ data: params.topic }),
      getSiteChrome(),
    ]);
    return { posts, chrome };
  },
  head: ({ params }) => ({ meta: [{ title: `${params.topic} - 折页` }] }),
  component: TopicPage,
});

function TopicPage() {
  const { posts, chrome } = Route.useLoaderData();
  const { topic } = Route.useParams();
  const known = (TOPICS as readonly string[]).includes(topic);

  return (
    <SiteShell {...siteChromeProps(chrome)} sidebar>
      <p className="text-sm text-muted-foreground">分类</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{known ? topic : "未知分类"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Link to="/categories" className="text-primary hover:underline">
          全部分类
        </Link>
      </p>
      <div className="mt-6 grid grid-cols-1 gap-6">
        {posts.map((post) => (
          <ArticleCard key={post.id} post={post} />
        ))}
      </div>
      {posts.length === 0 ? <p className="mt-10 text-sm text-muted-foreground">这个分类还没有文章。</p> : null}
    </SiteShell>
  );
}
