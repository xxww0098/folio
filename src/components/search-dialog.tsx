import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { PostListItem } from "@/lib/blog/types";
import { searchPublishedPosts } from "@/lib/blog/server";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function SearchDialog({ posts }: { posts: PostListItem[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState(posts);
  const [searching, setSearching] = useState(false);

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

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setHits(posts);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(() => {
      void searchPublishedPosts({ data: q })
        .then((found) => setHits(found))
        .catch(() => setHits(posts.filter((post) => `${post.title} ${post.topic} ${post.excerpt}`.includes(q))))
        .finally(() => setSearching(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, query, posts]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="搜索文章"
          className="text-header-foreground/80 hover:bg-header-foreground/10 hover:text-header-foreground"
        >
          <Search className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="top-3 w-[calc(100%-1.5rem)] max-h-[min(70dvh,32rem)] overflow-hidden p-0 [&>button]:hidden sm:top-[12%] sm:w-[min(100%-2rem,36rem)]">
        <DialogTitle className="sr-only">搜索</DialogTitle>
        <Command shouldFilter={false}>
          <CommandInput placeholder="搜索标题、正文、标签" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{searching ? "正在查找…" : "没有匹配的文章"}</CommandEmpty>
            <CommandGroup heading="文章">
              {hits.map((post) => (
                <CommandItem key={post.id} value={`${post.id} ${post.title}`} asChild>
                  <Link to="/posts/$slug" params={{ slug: post.slug }} onClick={() => setOpen(false)}>
                    <span className="min-w-0 flex-1 truncate">{post.title}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{post.topic}</span>
                  </Link>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
