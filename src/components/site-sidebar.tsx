import { Link } from "@tanstack/react-router";
import { FileText, FolderOpen, MessageCircle, Sparkles } from "lucide-react";
import { TOPICS, type PostListItem, type RecentComment, type TagRef } from "@/lib/blog/types";
import { formatZhDate } from "@/lib/format";

export function SiteSidebar({
  posts,
  tags,
  recentComments = [],
  nested = false,
}: {
  posts: PostListItem[];
  tags?: Array<TagRef & { count?: number }>;
  recentComments?: RecentComment[];
  nested?: boolean;
}) {
  const commentCount = posts.reduce((sum, post) => sum + post.commentCount, 0);
  const recent = posts.slice(0, 5);
  const topicCounts = TOPICS.map((topic) => ({
    topic,
    count: posts.filter((post) => post.topic === topic).length,
  })).filter((item) => item.count > 0);
  const tagCloud =
    tags && tags.length
      ? tags
      : [...new Map(posts.flatMap((post) => post.tags ?? []).map((tag) => [tag.slug, tag])).values()];

  return (
    <aside className={nested ? "flex flex-col gap-6" : "hidden w-72 shrink-0 flex-col gap-6 md:flex"}>
      <section className="overflow-hidden rounded-xl bg-card p-5 shadow-md">
        <div className="flex flex-col items-center text-center">
          <span className="grid size-16 place-items-center rounded-full bg-primary font-medium text-lg text-primary-foreground">
            折
          </span>
          <h2 className="mt-3 text-base font-semibold">折页</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            写给工程师的独立博客。类型系统、并发、数据库与工具链。
          </p>
        </div>
        <div className="mt-5 grid grid-cols-3 divide-x divide-border border-t border-border pt-4">
          <Stat icon={FileText} label="文章" value={posts.length} />
          <Stat icon={MessageCircle} label="评论" value={commentCount} />
          <Stat icon={FolderOpen} label="分类" value={topicCounts.length} />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl bg-header p-5 text-header-foreground shadow-md">
        <p className="flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="size-4" />
          会员抢先
        </p>
        <p className="mt-2 text-sm leading-relaxed text-header-foreground/75">
          新文会员立刻读，到期自动公开。订阅后不限次数。
        </p>
        <Link
          to="/membership"
          className="mt-4 inline-flex h-11 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          了解会员
        </Link>
      </section>

      <section className="overflow-hidden rounded-xl bg-card p-4 shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">分类</h3>
          <Link to="/categories" className="text-xs text-muted-foreground hover:text-primary">
            全部
          </Link>
        </div>
        <ul className="space-y-1">
          {topicCounts.map(({ topic, count }) => (
            <li key={topic}>
              <Link
                to="/topics/$topic"
                params={{ topic }}
                className="flex h-10 items-center justify-between rounded-md px-2 text-sm hover:bg-secondary"
              >
                <span className="font-mono text-sm">{topic}</span>
                <span className="tabular-nums text-muted-foreground">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="overflow-hidden rounded-xl bg-card p-4 shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">标签</h3>
          <Link to="/tags" className="text-xs text-muted-foreground hover:text-primary">
            全部
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {tagCloud.map((tag) => (
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
      </section>

      <section className="overflow-hidden rounded-xl bg-card p-4 shadow-md">
        <h3 className="mb-3 text-sm font-semibold">最新文章</h3>
        <ul className="space-y-3">
          {recent.map((post) => (
            <li key={post.id} className="flex gap-3">
              {post.coverImage ? (
                <Link to="/posts/$slug" params={{ slug: post.slug }} className="shrink-0">
                  <img src={post.coverImage} alt="" className="size-14 rounded-md object-cover" />
                </Link>
              ) : null}
              <div className="min-w-0">
                <Link
                  to="/posts/$slug"
                  params={{ slug: post.slug }}
                  className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary"
                >
                  {post.title}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">{formatZhDate(post.publishedAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {recentComments.length ? (
        <section className="overflow-hidden rounded-xl bg-card p-4 shadow-md">
          <h3 className="mb-3 text-sm font-semibold">最新评论</h3>
          <ul className="space-y-3">
            {recentComments.map((comment) => (
              <li key={comment.id}>
                <p className="line-clamp-2 text-sm text-muted-foreground">{comment.body}</p>
                <Link
                  to="/posts/$slug"
                  params={{ slug: comment.postSlug }}
                  className="mt-1 block text-xs text-primary hover:underline"
                >
                  {comment.authorName} · {comment.postTitle}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-lg font-semibold tabular-nums leading-none">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
