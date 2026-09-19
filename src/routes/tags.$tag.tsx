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
  const label = tag ? `#${tag.name}` : "未知标签";
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
              <Link to="/tags">标签</Link>
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
          <AlertDescription>这个标签还没有文章。</AlertDescription>
        </Alert>
      ) : null}
    </SiteShell>
  );
}
