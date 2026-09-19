import { createFileRoute, Link } from "@tanstack/react-router";
import { PostFeed } from "@/components/post-feed";
import { SiteShell, siteChromeProps } from "@/components/site-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getSiteChrome, listPostsByTopic } from "@/lib/blog/server";

export const Route = createFileRoute("/topics/$topic")({
  loader: async ({ params }) => {
    const [posts, chrome] = await Promise.all([
      listPostsByTopic({ data: params.topic }),
      getSiteChrome(),
    ]);
    return { posts, chrome };
  },
  head: ({ params }) => ({
    meta: [
      { title: `${params.topic} - 折页` },
      { name: "description", content: `折页「${params.topic}」栏目下的文章。` },
    ],
    links: [{ rel: "canonical", href: `/topics/${params.topic}` }],
  }),
  component: TopicPage,
});

function TopicPage() {
  const { posts, chrome } = Route.useLoaderData();
  const { topic } = Route.useParams();
  const known = chrome.topics.includes(topic);
  const label = known ? topic : "未知分类";

  return (
    <SiteShell {...siteChromeProps(chrome)} sidebar>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">首页</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/categories">分类</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{label}</h1>
      <div className="mt-6">
        <PostFeed posts={posts} />
      </div>
      {posts.length === 0 ? (
        <Alert variant="muted" className="mt-10">
          <AlertDescription>这个分类还没有文章。</AlertDescription>
        </Alert>
      ) : null}
    </SiteShell>
  );
}
