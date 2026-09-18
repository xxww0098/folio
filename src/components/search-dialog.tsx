import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { PostListItem } from "@/lib/blog/types";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function SearchDialog({ posts }: { posts: PostListItem[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts.slice(0, 8);
    return posts
      .filter((post) => `${post.title}${post.excerpt}${post.topic}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [posts, query]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-md text-header-foreground/80 transition-colors duration-150 hover:bg-header-foreground/10 hover:text-header-foreground"
          aria-label="搜索文章"
        >
          <Search className="size-5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>搜索</DialogTitle>
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索标题、导语或分类"
          className="mt-3"
        />
        <ul className="mt-3 max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <li className="px-1 py-6 text-center text-sm text-muted-foreground">没有匹配的文章</li>
          ) : (
            results.map((post) => (
              <li key={post.id}>
                <Link
                  to="/posts/$slug"
                  params={{ slug: post.slug }}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-3 hover:bg-secondary"
                >
                  <p className="text-sm font-medium">{post.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {post.topic} · {post.excerpt}
                  </p>
                </Link>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
