import { createFileRoute, Link } from "@tanstack/react-router";
import { ArticleCard } from "@/components/article-card";
import { SiteShell, siteChromeProps } from "@/components/site-shell";
import { getSiteChrome, listPostsByTag } from "@/lib/blog/server";

export const Route = createFileRoute("/tags/$tag")({
  loader: async ({ params }) => {
    const [chrome, data] = await Promise.all([getSiteChrome(), listPostsByTag({ data: params.tag })]);
    return { chrome, ...data };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.tag ? `${loaderData.tag.name} - 折页` : "标签 - 折页" }],
  }),
  component: TagPage,
});

function TagPage() {
  const { chrome, tag, posts } = Route.useLoaderData();
  return (
    <SiteShell {...siteChromeProps(chrome)} sidebar>
      <p className="text-sm text-muted-foreground">标签</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{tag ? `#${tag.name}` : "未知标签"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Link to="/tags" className="text-primary hover:underline">
          全部标签
        </Link>
      </p>
      <div className="mt-6 grid grid-cols-1 gap-6">
        {posts.map((post) => (
          <ArticleCard key={post.id} post={post} />
        ))}
      </div>
      {posts.length === 0 ? <p className="mt-10 text-sm text-muted-foreground">这个标签还没有文章。</p> : null}
    </SiteShell>
  );
}
