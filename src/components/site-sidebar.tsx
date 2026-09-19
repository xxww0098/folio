import { Link } from "@tanstack/react-router";
import { FileText, FolderOpen, MessageCircle } from "lucide-react";
import type { PostListItem, RecentComment, TagRef } from "@/lib/blog/types";
import { formatZhDate } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function SiteSidebar({
  posts,
  tags,
  recentComments = [],
  topics,
  nested = false,
}: {
  posts: PostListItem[];
  tags?: Array<TagRef & { count?: number }>;
  recentComments?: RecentComment[];
  topics?: string[];
  nested?: boolean;
}) {
  const commentCount = posts.reduce((sum, post) => sum + post.commentCount, 0);
  const recent = posts.slice(0, 5);
  const topicList = topics?.length ? topics : [...new Set(posts.map((post) => post.topic))];
  const topicCounts = topicList
    .map((topic) => ({
      topic,
      count: posts.filter((post) => post.topic === topic).length,
    }))
    .filter((item) => item.count > 0);
  const tagCloud =
    tags && tags.length
      ? tags
      : [...new Map(posts.flatMap((post) => post.tags ?? []).map((tag) => [tag.slug, tag])).values()];

  return (
    <aside className={nested ? "flex min-w-0 flex-col gap-6 overflow-hidden" : "hidden w-72 shrink-0 flex-col gap-6 md:flex"}>
      <Card className="shadow-md">
        <CardHeader className="items-center text-center">
          <Avatar className="size-16">
            <AvatarFallback className="bg-primary text-lg font-medium text-primary-foreground">折</AvatarFallback>
          </Avatar>
          <CardTitle className="font-sans text-base">折页</CardTitle>
          <CardDescription>类型系统、并发、数据库。</CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <div className="grid grid-cols-3 divide-x divide-border">
            <Stat icon={FileText} label="文章" value={posts.length} />
            <Stat icon={MessageCircle} label="评论" value={commentCount} />
            <Stat icon={FolderOpen} label="分类" value={topicCounts.length} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 bg-header text-header-foreground shadow-md">
        <CardHeader className="p-5">
          <p className="text-sm font-medium text-primary">会员抢先</p>
          <p className="text-sm text-header-foreground/75">新文立刻读全文。</p>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <Button asChild>
            <Link to="/membership">订阅</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className="font-sans text-sm">分类</CardTitle>
          <Button asChild variant="link" className="h-auto p-0 text-xs text-muted-foreground">
            <Link to="/categories">全部</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <ul className="space-y-1">
            {topicCounts.map(({ topic, count }) => (
              <li key={topic}>
                <Link
                  to="/topics/$topic"
                  params={{ topic }}
                  className="flex h-10 items-center justify-between rounded-md px-2 text-sm hover:bg-secondary"
                >
                  <span className="min-w-0 truncate font-mono text-sm">{topic}</span>
                  <Badge variant="secondary" className="tabular-nums">
                    {count}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className="font-sans text-sm">标签</CardTitle>
          <Button asChild variant="link" className="h-auto p-0 text-xs text-muted-foreground">
            <Link to="/tags">全部</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 p-4 pt-2">
          {tagCloud.map((tag) => (
            <Badge key={tag.slug} asChild variant="secondary">
              <Link to="/tags/$tag" params={{ tag: tag.slug }}>
                #{tag.name}
              </Link>
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="font-sans text-sm">最新文章</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <ul className="space-y-3">
            {recent.map((post) => (
              <li key={post.id} className="flex gap-3">
                {post.coverImage ? (
                  <Link to="/posts/$slug" params={{ slug: post.slug }} className="shrink-0">
                    <img src={post.coverImage} alt="" loading="lazy" decoding="async" className="size-14 rounded-md object-cover" />
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
        </CardContent>
      </Card>

      {recentComments.length ? (
        <Card className="shadow-md">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="font-sans text-sm">最新评论</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <ul className="space-y-3">
              {recentComments.map((comment) => (
                <li key={comment.id}>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{comment.body}</p>
                  <Link
                    to="/posts/$slug"
                    params={{ slug: comment.postSlug }}
                    className="mt-1 block truncate text-xs text-primary hover:underline"
                  >
                    {comment.authorName} · {comment.postTitle}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
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
