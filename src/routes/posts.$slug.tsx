import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Clock, Eye, MessageCircle } from "lucide-react";
import { useEffect } from "react";
import { AccessBadge } from "@/components/access-badge";
import { ArticleToc } from "@/components/article-toc";
import { ArticleWiki } from "@/components/article-wiki";
import { CommentThread } from "@/components/comment-thread";
import { LikeButton } from "@/components/like-button";
import { Paywall } from "@/components/paywall";
import { ShareBar } from "@/components/share-bar";
import { ReadingProgress } from "@/components/reading-progress";
import { SiteShell } from "@/components/site-shell";
import { ArticleBody, extractToc } from "@/lib/blog/markdown";
import { getPostBySlug, getSiteChrome } from "@/lib/blog/server";
import { listComments } from "@/lib/comments/server";
import { getLikeState, recordView } from "@/lib/likes/server";
import { formatReading, formatZhDate } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.post ? `${loaderData.post.title} - 折页` : "折页 Folio",
      },
    ],
  }),
  notFoundComponent: ArticleMissing,
  component: ArticlePage,
});

function ArticleMissing() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-sm text-muted-foreground">404</p>
        <h1 className="mt-3 text-2xl font-semibold">文章不存在</h1>
        <Link to="/" className="mt-6 inline-flex h-11 items-center text-sm text-primary hover:underline">
          返回首页
        </Link>
      </div>
    </SiteShell>
  );
}

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
      posts={chrome.posts}
      tags={chrome.tags}
      recentComments={chrome.recentComments}
      sidebar
      sidebarExtra={
        <>
          <ArticleToc items={toc} />
          <ArticleWiki wiki={post.wiki} title={post.title} />
        </>
      }
    >
      {locked ? null : <ReadingProgress />}
      <article className="overflow-hidden rounded-xl bg-card p-4 shadow-md sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
            {post.authorName.slice(0, 1)}
          </span>
          <div>
            <p className="text-sm font-semibold">{post.authorName}</p>
            <p className="text-xs text-muted-foreground">{formatZhDate(post.publishedAt)}</p>
          </div>
        </div>
        <h1 className="mt-5 text-2xl font-semibold leading-snug tracking-tight sm:text-4xl">{post.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Link to="/topics/$topic" params={{ topic: post.topic }} className="font-mono text-xs font-medium text-primary hover:underline">
            {post.topic}
          </Link>
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
          {post.status === "draft" ? (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">草稿</span>
          ) : null}
        </div>
        {post.coverImage ? (
          <img
            src={post.coverImage}
            alt={post.coverAlt ?? post.title}
            className="folio-photo mt-6 aspect-16/9 w-full rounded-lg object-cover"
          />
        ) : null}
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">{post.excerpt}</p>
        <div className="mt-6 space-y-4 md:hidden">
          <ArticleToc items={toc} />
          <ArticleWiki wiki={post.wiki} title={post.title} />
        </div>
        <div className={cn("mt-4", locked && "paywall-preview")}>
          <ArticleBody source={post.body} catalog={post.wiki.catalog} />
        </div>
        <Paywall access={post.access} slug={post.slug} />
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Link
              to="/topics/$topic"
              params={{ topic: post.topic }}
              className="inline-flex h-8 items-center rounded-full bg-secondary px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              #{post.topic}
            </Link>
            {post.tags.map((tag) => (
              <Link
                key={tag.slug}
                to="/tags/$tag"
                params={{ tag: tag.slug }}
                className="inline-flex h-8 items-center rounded-full bg-secondary px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <ShareBar title={post.title} />
            <LikeButton postId={post.id} initialCount={like.count} initialLiked={like.liked} />
          </div>
        </div>
        {(prev || next) ? (
          <nav className="mt-10 grid gap-4 border-t border-border pt-8 sm:grid-cols-2">
            {prev ? (
              <Link to="/posts/$slug" params={{ slug: prev.slug }} className="rounded-lg bg-secondary p-4 hover:bg-secondary/80">
                <p className="text-xs text-muted-foreground">上一篇</p>
                <p className="mt-1 text-sm font-medium">{prev.title}</p>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                to="/posts/$slug"
                params={{ slug: next.slug }}
                className="rounded-lg bg-secondary p-4 text-right hover:bg-secondary/80"
              >
                <p className="text-xs text-muted-foreground">下一篇</p>
                <p className="mt-1 text-sm font-medium">{next.title}</p>
              </Link>
            ) : null}
          </nav>
        ) : null}
        <CommentThread postId={post.id} comments={comments} allowComments={post.allowComments} />
        {related.length ? (
          <section className="mt-10 border-t border-border pt-8">
            <h2 className="mb-4 text-base font-semibold">互相引用</h2>
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
      </article>
    </SiteShell>
  );
}