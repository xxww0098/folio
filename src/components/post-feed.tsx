import type { PostListItem } from "@/lib/blog/types";
import { ArticleCard } from "@/components/article-card";
import { useTheme } from "@/lib/theme/provider";

export function PostFeed({ posts }: { posts: PostListItem[] }) {
  const { layout } = useTheme();

  if (posts.length === 0) return null;

  if (layout === "grid") {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {posts.map((post) => (
          <ArticleCard key={post.id} post={post} variant="tile" />
        ))}
      </div>
    );
  }

  if (layout === "magazine") {
    const [hero, ...rest] = posts;
    return (
      <div className="space-y-6">
        <ArticleCard post={hero} variant="featured" />
        {rest.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {rest.map((post) => (
              <ArticleCard key={post.id} post={post} variant="compact" />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (layout === "stream") {
    return (
      <div className="divide-y divide-border">
        {posts.map((post) => (
          <ArticleCard key={post.id} post={post} variant="stream" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {posts.map((post) => (
        <ArticleCard key={post.id} post={post} />
      ))}
    </div>
  );
}
