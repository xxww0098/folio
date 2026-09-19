import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Clock, Eye, MessageCircle } from "lucide-react";
import { useEffect } from "react";
import { AccessBadge } from "@/components/access-badge";
import { ArticleToc, MobileToc } from "@/components/article-toc";
import { ArticleWiki } from "@/components/article-wiki";
import { CommentThread } from "@/components/comment-thread";
import { LikeButton } from "@/components/like-button";
import { MissingPage } from "@/components/missing-page";
import { Paywall } from "@/components/paywall";
import { ShareBar } from "@/components/share-bar";
import { ReadingProgress } from "@/components/reading-progress";
import { SiteShell, siteChromeProps } from "@/components/site-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArticleBody, extractToc } from "@/lib/blog/markdown";
import { getPostBySlug, getSiteChrome } from "@/lib/blog/server";
import { listComments } from "@/lib/comments/server";
import { getLikeState, recordView } from "@/lib/likes/server";
import { formatReading, formatZhDate } from "@/lib/format";
import { articleJsonLd, pageDescription } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { ZoomImage } from "@/components/zoom-image";

export const Route = createFileRoute("/posts/$slug")({
  loader: async ({ params }) => {
    const post = await getPostBySlug({ data: params.slug });
    if (!post) throw notFound();
    const [comments, chrome, like] = await Promise.all([
      listComments({ data: post.id }),
      getSiteChrome(),
      getLikeState({ data: post.id }),
    ]);
    const more = chrome.posts;
    const wikiSlugs = new Set([
      ...post.wiki.outgoing.map((item) => item.slug),
      ...post.wiki.backlinks.map((item) => item.slug),
    ]);
    const related = [
      ...more.filter((item) => wikiSlugs.has(item.slug)),
      ...more.filter((item) => item.slug !== post.slug && item.topic === post.topic && !wikiSlugs.has(item.slug)),
    ].slice(0, 4);
    const index = more.findIndex((item) => item.id === post.id);
    const next = index > 0 ? more[index - 1] : null;
    const prev = index >= 0 && index < more.length - 1 ? more[index + 1] : null;
    return { post, comments, related, chrome, like, prev, next };
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post) return { meta: [{ title: "折页 Folio" }] };
    return {
      meta: [
        { title: `${post.title} - 折页` },
        { name: "description", content: pageDescription(post.excerpt) },
      ],
      links: [{ rel: "canonical", href: `/posts/${post.slug}` }],
    };
  },
  notFoundComponent: () => <MissingPage title="文章不存在" />,
  component: ArticlePage,
});

function ArticlePage() {
  const { post, comments, related, chrome, like, prev, next } = Route.useLoaderData();
  const toc = extractToc(post.body);
  const locked = post.access.locked;

  useEffect(() => {
    if (post.status !== "published") return;
    void recordView({ data: post.id }).catch(() => undefined);
  }, [post.id, post.status]);

  return (
    <SiteShell
      {...siteChromeProps(chrome)}
      sidebar
      sidebarExtra={
        <>
          <ArticleToc items={toc} />
          <ArticleWiki wiki={post.wiki} title={post.title} />
        </>
      }
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            articleJsonLd({
              title: post.title,
              excerpt: post.excerpt,
              slug: post.slug,
              authorName: post.authorName,
              publishedAt: post.publishedAt,
              coverImage: post.coverImage,
            }),
          ),
        }}
      />
      {locked ? null : <ReadingProgress />}
      <MobileToc items={toc} />
      <Breadcrumb className="mb-3 sm:mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">首页</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/topics/$topic" params={{ topic: post.topic }}>
                {post.topic}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="line-clamp-1">{post.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Card className="overflow-hidden shadow-md">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <Avatar className="size-9 sm:size-10">
              <AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
                {post.authorName.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{post.authorName}</p>
              <p className="text-xs text-muted-foreground">{formatZhDate(post.publishedAt)}</p>
            </div>
          </div>
          <h1 className="mt-4 break-words text-2xl font-semibold leading-tight tracking-tight sm:mt-5 sm:text-4xl sm:leading-snug">
            {post.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            <Badge asChild variant="outline">
              <Link to="/topics/$topic" params={{ topic: post.topic }} className="font-mono text-xs text-primary">
                {post.topic}
              </Link>
            </Badge>
            <AccessBadge mode={post.access.mode} exclusive={post.access.exclusive} publicAt={post.access.publicAt} />
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {formatReading(post.readingMinutes)}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Eye className="size-3.5" />
              {post.viewCount}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <MessageCircle className="size-3.5" />
              {comments.length}
            </span>
            {post.status === "draft" ? <Badge variant="secondary">草稿</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className={cn("p-4 pt-0 sm:p-6 sm:pt-0", toc.length ? "pb-20 md:pb-6" : "")}>
          {post.coverImage ? (
            <ZoomImage
              src={post.coverImage}
              alt={post.coverAlt ?? post.title}
              className="folio-photo mt-2 aspect-16/9 w-full rounded-md object-cover sm:rounded-lg"
            />
          ) : null}
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:mt-6">{post.excerpt}</p>
          <div className={cn("mt-4", locked && "paywall-preview")}>
            <ArticleBody source={post.body} catalog={post.wiki.catalog} />
          </div>
          <Paywall access={post.access} slug={post.slug} />
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Badge asChild variant="secondary">
                <Link to="/topics/$topic" params={{ topic: post.topic }}>
                  #{post.topic}
                </Link>
              </Badge>
              {post.tags.map((tag) => (
                <Badge key={tag.slug} asChild variant="secondary">
                  <Link to="/tags/$tag" params={{ tag: tag.slug }}>
                    #{tag.name}
                  </Link>
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <ShareBar title={post.title} />
              <LikeButton postId={post.id} initialCount={like.count} initialLiked={like.liked} />
            </div>
          </div>
          <div className="mt-6 md:hidden">
            <ArticleWiki wiki={post.wiki} title={post.title} />
          </div>
          {prev || next ? (
            <nav className="mt-10 grid gap-4 sm:grid-cols-2">
              <Separator className="col-span-full" />
              {prev ? (
                <Link to="/posts/$slug" params={{ slug: prev.slug }}>
                  <Card className="h-full shadow-none">
                    <CardHeader className="p-4">
                      <CardDescription>上一篇</CardDescription>
                      <CardTitle className="font-sans text-sm font-medium">{prev.title}</CardTitle>
                    </CardHeader>
                  </Card>
                </Link>
              ) : (
                <div className="hidden sm:block" />
              )}
              {next ? (
                <Link to="/posts/$slug" params={{ slug: next.slug }}>
                  <Card className="h-full text-right shadow-none">
                    <CardHeader className="p-4">
                      <CardDescription>下一篇</CardDescription>
                      <CardTitle className="font-sans text-sm font-medium">{next.title}</CardTitle>
                    </CardHeader>
                  </Card>
                </Link>
              ) : null}
            </nav>
          ) : null}
          <CommentThread postId={post.id} comments={comments} allowComments={post.allowComments} />
          {related.length ? (
            <section className="mt-10">
              <Separator />
              <h2 className="mb-4 mt-8 text-base font-semibold">互相引用</h2>
              <ul className="space-y-3">
                {related.map((item) => (
                  <li key={item.id}>
                    <Link to="/posts/$slug" params={{ slug: item.slug }} className="text-sm font-medium hover:text-primary">
                      {item.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{item.excerpt}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </CardContent>
      </Card>
    </SiteShell>
  );
}
