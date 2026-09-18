import { Link } from "@tanstack/react-router";
import { Clock, Eye, Heart, MessageCircle } from "lucide-react";
import type { PostListItem } from "@/lib/blog/types";
import { formatReading, formatZhDate } from "@/lib/format";
import { AccessBadge } from "@/components/access-badge";
import { cn } from "@/lib/utils";

export function ArticleCard({
  post,
  variant = "default",
}: {
  post: PostListItem;
  variant?: "default" | "compact" | "featured";
}) {
  if (variant === "compact") {
    return (
      <article className="flex gap-3">
        {post.coverImage ? (
          <Link to="/posts/$slug" params={{ slug: post.slug }} className="shrink-0">
            <img src={post.coverImage} alt="" className="size-14 rounded-md object-cover" />
          </Link>
        ) : null}
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-medium">
            <Link to="/posts/$slug" params={{ slug: post.slug }} className="hover:text-primary">
              {post.title}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{formatZhDate(post.publishedAt)}</p>
        </div>
      </article>
    );
  }

  const horizontal = variant === "featured" || variant === "default";

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-xl bg-card shadow-md ring-1 ring-transparent transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:ring-foreground/10",
        horizontal && "grid grid-cols-1 sm:grid-cols-5",
      )}
    >
      {post.coverImage ? (
        <Link
          to="/posts/$slug"
          params={{ slug: post.slug }}
          className={cn("relative block overflow-hidden", horizontal && "sm:col-span-2")}
        >
          <img
            src={post.coverImage}
            alt={post.coverAlt ?? post.title}
            className="aspect-16/10 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </Link>
      ) : null}
      <div
        className={cn(
          "flex flex-col justify-between gap-3 p-4",
          horizontal && (post.coverImage ? "sm:col-span-3" : "sm:col-span-5"),
        )}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/topics/$topic"
              params={{ topic: post.topic }}
              className="font-mono text-xs font-medium text-primary hover:underline"
            >
              {post.topic}
            </Link>
            <AccessBadge mode={post.accessMode} exclusive={post.exclusive} publicAt={post.publicAt} />
            {(post.tags ?? []).slice(0, 2).map((tag) => (
              <Link
                key={tag.slug}
                to="/tags/$tag"
                params={{ tag: tag.slug }}
                className="text-sm italic text-muted-foreground hover:text-primary"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
          <h2 className="text-lg font-semibold leading-snug">
            <Link to="/posts/$slug" params={{ slug: post.slug }} className="hover:text-primary">
              {post.title}
            </Link>
          </h2>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>{formatZhDate(post.publishedAt)}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {formatReading(post.readingMinutes)}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Eye className="size-3.5" />
            {post.viewCount}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Heart className="size-3.5" />
            {post.likeCount}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <MessageCircle className="size-3.5" />
            {post.commentCount}
          </span>
        </div>
      </div>
    </article>
  );
}