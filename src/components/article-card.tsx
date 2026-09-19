import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Clock, Eye, Heart, MessageCircle } from "lucide-react";
import type { PostListItem } from "@/lib/blog/types";
import { formatReading, formatZhDate } from "@/lib/format";
import { AccessBadge } from "@/components/access-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type CardVariant = "default" | "compact" | "featured" | "tile" | "stream";

export function ArticleCard({
  post,
  variant = "default",
}: {
  post: PostListItem;
  variant?: CardVariant;
}) {
  if (variant === "stream") {
    return (
      <article className="flex items-baseline justify-between gap-4 py-3">
        <h2 className="min-w-0 truncate text-base font-medium">
          <Link to="/posts/$slug" params={{ slug: post.slug }} className="hover:text-primary">
            {post.title}
          </Link>
        </h2>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span className="hidden font-mono sm:inline">{post.topic}</span>
          <span className="tabular-nums">{formatZhDate(post.publishedAt)}</span>
        </div>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <Card className="flex gap-3 p-3 shadow-md">
        {post.coverImage ? (
          <Link to="/posts/$slug" params={{ slug: post.slug }} className="shrink-0">
            <img src={post.coverImage} alt="" loading="lazy" decoding="async" className="size-16 rounded-md object-cover" />
          </Link>
        ) : null}
        <div className="min-w-0">
          <Badge variant="outline" className="font-mono text-[11px] text-primary">
            {post.topic}
          </Badge>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-medium">
            <Link to="/posts/$slug" params={{ slug: post.slug }} className="hover:text-primary">
              {post.title}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{formatZhDate(post.publishedAt)}</p>
        </div>
      </Card>
    );
  }

  if (variant === "featured") {
    return (
      <Card className="group overflow-hidden shadow-md">
        {post.coverImage ? (
          <Link to="/posts/$slug" params={{ slug: post.slug }} className="relative block overflow-hidden">
            <img
              src={post.coverImage}
              alt={post.coverAlt ?? post.title}
              className="folio-cover aspect-[2/1] size-full object-cover sm:aspect-[2.2/1]"
              loading="lazy"
              decoding="async"
            />
          </Link>
        ) : null}
        <CardHeader className="space-y-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <TopicLink topic={post.topic} />
            <AccessBadge mode={post.accessMode} exclusive={post.exclusive} publicAt={post.publicAt} />
          </div>
          <CardTitle className="font-display text-2xl font-semibold leading-snug tracking-tight">
            <Link to="/posts/$slug" params={{ slug: post.slug }} className="hover:text-primary">
              {post.title}
            </Link>
          </CardTitle>
          <CardDescription className="line-clamp-3">{post.excerpt}</CardDescription>
        </CardHeader>
        <CardFooter className="px-5 pb-5 pt-0 sm:px-6">
          <Meta post={post} />
        </CardFooter>
      </Card>
    );
  }

  if (variant === "tile") {
    return (
      <Card className="group flex h-full flex-col overflow-hidden shadow-md">
        {post.coverImage ? (
          <Link to="/posts/$slug" params={{ slug: post.slug }} className="relative block overflow-hidden">
            <img
              src={post.coverImage}
              alt={post.coverAlt ?? post.title}
              className="folio-cover aspect-16/9 size-full object-cover sm:aspect-16/10"
              loading="lazy"
              decoding="async"
            />
          </Link>
        ) : (
          <div className="aspect-16/9 bg-secondary sm:aspect-16/10" />
        )}
        <CardContent className="flex flex-1 flex-col gap-2 p-4">
          <TopicLink topic={post.topic} />
          <h2 className="text-base font-semibold leading-snug">
            <Link to="/posts/$slug" params={{ slug: post.slug }} className="hover:text-primary">
              {post.title}
            </Link>
          </h2>
          <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
          <p className="text-xs text-muted-foreground">{formatZhDate(post.publishedAt)}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group grid overflow-hidden shadow-md grid-cols-1 sm:grid-cols-5">
      {post.coverImage ? (
        <Link
          to="/posts/$slug"
          params={{ slug: post.slug }}
          className="relative block overflow-hidden sm:col-span-2"
        >
          <img
            src={post.coverImage}
            alt={post.coverAlt ?? post.title}
            className="folio-cover aspect-16/10 size-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </Link>
      ) : null}
      <div className={cn("flex flex-col justify-between gap-3 p-4", post.coverImage ? "sm:col-span-3" : "sm:col-span-5")}>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <TopicLink topic={post.topic} />
            <AccessBadge mode={post.accessMode} exclusive={post.exclusive} publicAt={post.publicAt} />
          </div>
          <h2 className="text-lg font-semibold leading-snug">
            <Link to="/posts/$slug" params={{ slug: post.slug }} className="hover:text-primary">
              {post.title}
            </Link>
          </h2>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
        </div>
        <Meta post={post} />
      </div>
    </Card>
  );
}

function TopicLink({ topic }: { topic: string }) {
  return (
    <Badge asChild variant="outline">
      <Link to="/topics/$topic" params={{ topic }} className="font-mono text-xs text-primary hover:bg-secondary">
        {topic}
      </Link>
    </Badge>
  );
}

function Meta({ post }: { post: PostListItem }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span>{formatZhDate(post.publishedAt)}</span>
      <Separator orientation="vertical" className="hidden h-3 sm:block" />
      <MetaTip label="阅读时长">
        <Clock className="size-3.5" />
        {formatReading(post.readingMinutes)}
      </MetaTip>
      <MetaTip label="浏览">
        <Eye className="size-3.5" />
        {post.viewCount}
      </MetaTip>
      <MetaTip label="喜欢">
        <Heart className="size-3.5" />
        {post.likeCount}
      </MetaTip>
      <MetaTip label="评论">
        <MessageCircle className="size-3.5" />
        {post.commentCount}
      </MetaTip>
    </div>
  );
}

function MetaTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 tabular-nums">{children}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
