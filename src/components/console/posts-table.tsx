import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PostListItem, PostStatus } from "@/lib/blog/types";
import { ACCESS_LABEL } from "@/lib/membership/access";
import { formatZhDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 10;

export function PostsTable({
  posts,
  busy,
  onStatus,
  onFeatured,
  onDelete,
  onBulkStatus,
  onBulkDelete,
}: {
  posts: PostListItem[];
  busy: string | null;
  onStatus: (id: number, status: PostStatus) => void;
  onFeatured: (id: number, featured: boolean) => void;
  onDelete: (id: number) => void;
  onBulkStatus: (ids: number[], status: PostStatus) => void;
  onBulkDelete: (ids: number[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [topic, setTopic] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);

  const topics = useMemo(
    () => [...new Set(posts.map((post) => post.topic).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh")),
    [posts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (status !== "all" && post.status !== status) return false;
      if (topic !== "all" && post.topic !== topic) return false;
      if (!q) return true;
      return `${post.title} ${post.topic} ${post.excerpt}`.toLowerCase().includes(q);
    });
  }, [posts, query, status, topic]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const pageIds = slice.map((post) => post.id);
  const selectedOnPage = pageIds.filter((id) => selected.includes(id));
  const allOnPage = slice.length > 0 && selectedOnPage.length === slice.length;
  const someOnPage = selectedOnPage.length > 0 && !allOnPage;

  function resetPage() {
    setPage(1);
    setSelected([]);
  }

  function toggleAll() {
    if (allOnPage) {
      setSelected((currentIds) => currentIds.filter((id) => !pageIds.includes(id)));
      return;
    }
    setSelected((currentIds) => [...new Set([...currentIds, ...pageIds])]);
  }

  function toggleOne(id: number) {
    setSelected((currentIds) => (currentIds.includes(id) ? currentIds.filter((item) => item !== id) : [...currentIds, id]));
  }

  const selectedIds = selected.filter((id) => filtered.some((post) => post.id === id));

  return (
    <div>
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            resetPage();
          }}
          placeholder="搜索标题"
          className="h-10 bg-console-card sm:max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            resetPage();
          }}
        >
          <SelectTrigger className="h-10 w-full bg-console-card sm:w-32">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="published">已发布</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={topic}
          onValueChange={(value) => {
            setTopic(value);
            resetPage();
          }}
        >
          <SelectTrigger className="h-10 w-full bg-console-card sm:w-36">
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {topics.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-console-line px-5 py-3 text-sm">
          <span className="text-console-muted">已选 {selectedIds.length} 篇</span>
          <Button size="sm" variant="ghost" disabled={busy === "bulk"} onClick={() => onBulkStatus(selectedIds, "published")}>
            发布
          </Button>
          <Button size="sm" variant="ghost" disabled={busy === "bulk"} onClick={() => onBulkStatus(selectedIds, "draft")}>
            撤回
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" disabled={busy === "bulk"} onClick={() => onBulkDelete(selectedIds)}>
            删除
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            取消选择
          </Button>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="px-5 py-10 text-sm text-console-muted">{posts.length === 0 ? "还没有文章。从一篇短的开始。" : "没有符合条件的文章。"}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Checkbox
                  checked={allOnPage ? true : someOnPage ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  aria-label="全选本页"
                />
              </TableHead>
              <TableHead>标题</TableHead>
              <TableHead>分类</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>阅读</TableHead>
              <TableHead>更新</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((post) => (
              <TableRow key={post.id} data-state={selected.includes(post.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.includes(post.id)}
                    onCheckedChange={() => toggleOne(post.id)}
                    aria-label={`选择 ${post.title}`}
                  />
                </TableCell>
                <TableCell className="min-w-48 max-w-xs">
                  <Link to="/console" search={{ section: "write", id: post.id }} className="font-medium hover:text-console-brand">
                    {post.title}
                  </Link>
                  {post.exclusive ? (
                    <p className="mt-0.5 text-xs text-console-muted">{ACCESS_LABEL[post.accessMode]}</p>
                  ) : null}
                </TableCell>
                <TableCell className="whitespace-nowrap text-console-muted">{post.topic}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {post.status === "published" ? "已发布" : "草稿"}
                  {post.featured ? " · 置顶" : ""}
                </TableCell>
                <TableCell className="tabular-nums text-console-muted">{post.viewCount}</TableCell>
                <TableCell className="whitespace-nowrap text-console-muted">
                  {post.updatedAt ? formatZhDate(post.updatedAt) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/console" search={{ section: "write", id: post.id }}>
                        编辑
                      </Link>
                    </Button>
                    {post.status === "published" ? (
                      <Button size="sm" variant="ghost" disabled={busy === `feat-${post.id}`} onClick={() => onFeatured(post.id, !post.featured)}>
                        {post.featured ? "取消置顶" : "置顶"}
                      </Button>
                    ) : null}
                    {post.status === "published" ? (
                      <Button size="sm" variant="ghost" disabled={busy === `status-${post.id}`} onClick={() => onStatus(post.id, "draft")}>
                        撤回
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" disabled={busy === `status-${post.id}`} onClick={() => onStatus(post.id, "published")}>
                        发布
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" disabled={busy === `del-${post.id}`} onClick={() => onDelete(post.id)}>
                      删除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {filtered.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-console-muted">
          <p>
            第 {current} / {pages} 页 · 共 {filtered.length} 篇
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={current <= 1} onClick={() => setPage((n) => Math.max(1, n - 1))}>
              <ChevronLeft className="size-4" />
              上一页
            </Button>
            <Button size="sm" variant="outline" disabled={current >= pages} onClick={() => setPage((n) => Math.min(pages, n + 1))}>
              下一页
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
