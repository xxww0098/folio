import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteShell, siteChromeProps } from "@/components/site-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getSiteChrome } from "@/lib/blog/server";
import { type PostListItem } from "@/lib/blog/types";
import { formatZhDate } from "@/lib/format";
import { requirePublicPage } from "@/lib/pages/server";

export const Route = createFileRoute("/archive")({
  beforeLoad: () => requirePublicPage("archive"),
  loader: () => getSiteChrome(),
  head: () => ({ meta: [{ title: "归档 - 折页" }] }),
  component: ArchivePage,
});

function ArchivePage() {
  const chrome = Route.useLoaderData();
  const { posts } = chrome;
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
    <SiteShell {...siteChromeProps(chrome)} sidebar>
      <h1 className="text-2xl font-semibold tracking-tight">归档</h1>
      <p className="mt-2 text-sm text-muted-foreground">按年份浏览全部文章。</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索文章"
          className="max-w-sm"
        />
      </div>
      <ToggleGroup
        type="single"
        value={topic}
        onValueChange={(value) => {
          if (value) setTopic(value);
        }}
        variant="outline"
        size="sm"
        className="mt-4 flex flex-wrap justify-start gap-2"
      >
        {["全部", ...chrome.topics].map((item) => (
          <ToggleGroupItem key={item} value={item} className="rounded-full font-mono">
            {item}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="mt-8 space-y-8">
        {grouped.map(([year, items]) => (
          <Card key={year} className="overflow-hidden shadow-md">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="font-sans text-lg">{year}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  {items.map((post) => (
                    <TableRow key={post.id} className="border-border hover:bg-secondary/60">
                      <TableCell>
                        <Link to="/posts/$slug" params={{ slug: post.slug }} className="font-medium hover:text-primary">
                          {post.title}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                        {post.topic} · {formatZhDate(post.publishedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
      {filtered.length === 0 ? (
        <Alert variant="muted" className="mt-10">
          <AlertDescription>
            没有匹配的文章。
            <Button asChild variant="link" className="h-auto px-1">
              <Link to="/">返回首页</Link>
            </Button>
          </AlertDescription>
        </Alert>
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
