import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { PostListItem } from "@/lib/blog/types";
import type { Role } from "@/lib/roles";
import type { WorkspaceArea } from "@/lib/workspace";
import { workspacePath } from "@/lib/workspace";
import { commandItemsFor, type ConsoleSection } from "./nav";

export function ConsoleCommand({
  area,
  role,
  open,
  onOpenChange,
  posts,
}: {
  area: WorkspaceArea;
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posts: PostListItem[];
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const home = workspacePath(area);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const q = query.trim().toLowerCase();
  const pages = useMemo(() => {
    const items = commandItemsFor(area, role);
    return items.filter((item) => !q || `${item.label}${item.hint}`.toLowerCase().includes(q));
  }, [area, q, role]);
  const articles = useMemo(() => {
    if (!q) return posts.slice(0, 5);
    return posts.filter((post) => `${post.title}${post.topic}${post.excerpt}`.toLowerCase().includes(q)).slice(0, 6);
  }, [posts, q]);

  function goSection(section: ConsoleSection) {
    onOpenChange(false);
    void navigate({ to: home, search: { section } });
  }

  function goHref(href: string) {
    onOpenChange(false);
    if (href.startsWith("/posts/")) {
      void navigate({ to: "/posts/$slug", params: { slug: href.slice("/posts/".length) } });
      return;
    }
    if (href === "/me") {
      void navigate({ to: "/me" });
      return;
    }
    if (href === "/membership") {
      void navigate({ to: "/membership" });
      return;
    }
    void navigate({ to: "/" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <DialogTitle className="sr-only">搜索</DialogTitle>
        <div className="flex items-center gap-2 border-b border-console-line px-3">
          <Search className="size-4 text-console-muted" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索"
            className="h-12 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {pages.length > 0 ? (
            <ul>
              {pages.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-console-active"
                    onClick={() => (item.section ? goSection(item.section) : goHref(item.href ?? "/"))}
                  >
                    <span className="text-sm">{item.label}</span>
                    <span className="text-xs text-console-muted">{item.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {articles.length > 0 ? (
            <div className="mt-2">
              <p className="px-3 py-1.5 text-xs text-console-muted">文章</p>
              <ul>
                {articles.map((post) => (
                  <li key={post.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-console-active"
                      onClick={() => {
                        onOpenChange(false);
                        if (area === "console") {
                          void navigate({ to: "/console", search: { section: "write", id: post.id } });
                          return;
                        }
                        goHref(`/posts/${post.slug}`);
                      }}
                    >
                      <span className="truncate text-sm">{post.title}</span>
                      <span className="ml-3 shrink-0 font-mono text-xs text-console-muted">{post.topic}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {pages.length === 0 && articles.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-console-muted">没有匹配的结果</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
