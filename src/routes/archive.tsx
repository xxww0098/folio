import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { Input } from "@/components/ui/input";
import { getSiteChrome } from "@/lib/blog/server";
import { TOPICS, type PostListItem } from "@/lib/blog/types";
import { formatZhDate } from "@/lib/format";

export const Route = createFileRoute("/archive")({
  loader: () => getSiteChrome(),
  head: () => ({ meta: [{ title: "归档 - 折页" }] }),
  component: ArchivePage,
});

function ArchivePage() {
  const { posts, tags, recentComments } = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string>("全部");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((post) => {
      const topicOk = topic === "全部" || post.topic === topic;
      if (!topicOk) return false;
      if (!q) return true;
      return `${post.title}${post.excerpt}`.toLowerCase().includes(q);
    });
  }, [posts, query, topic]);

  const grouped = useMemo(() => groupByYear(filtered), [filtered]);

  return (
    <SiteShell posts={posts} tags={tags} recentComments={recentComments} sidebar>
      <h1 className="text-2xl font-semibold tracking-tight">归档</h1>
      <p className="mt-2 text-sm text-muted-foreground">按年份浏览全部文章。</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索标题或导语"
          className="max-w-sm bg-card"
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {["全部", ...TOPICS].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTopic(item)}
            className={
              item === topic
                ? "inline-flex h-9 items-center rounded-full bg-primary px-3 font-mono text-xs text-primary-foreground"
                : "inline-flex h-9 items-center rounded-full bg-card px-3 font-mono text-xs text-muted-foreground shadow-md hover:text-foreground"
            }
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mt-8 space-y-10">
        {grouped.map(([year, items]) => (
          <section key={year}>
            <h2 className="mb-4 text-lg font-semibold">{year}</h2>
            <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-md">
              {items.map((post) => (
                <li key={post.id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between">
                  <Link to="/posts/$slug" params={{ slug: post.slug }} className="font-medium hover:text-primary">
                    {post.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {post.topic} · {formatZhDate(post.publishedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          没有匹配的文章。
          <Link to="/" className="ml-2 text-primary hover:underline">
            返回首页
          </Link>
        </p>
      ) : null}
    </SiteShell>
  );
}

function groupByYear(posts: PostListItem[]) {
  const map = new Map<string, PostListItem[]>();
  for (const post of posts) {
    const year = post.publishedAt ? String(new Date(post.publishedAt).getFullYear()) : "未发布";
    const list = map.get(year) ?? [];
    list.push(post);
    map.set(year, list);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}
