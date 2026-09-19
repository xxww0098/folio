import { useEffect, useState } from "react";
import { List } from "lucide-react";
import type { TocItem } from "@/lib/blog/markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function useActiveHeading(items: TocItem[]) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    if (!items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = visible[0]?.target.id;
        if (id) setActive(id);
      },
      { rootMargin: "-18% 0px -70% 0px", threshold: [0, 1] },
    );
    for (const item of items) {
      const node = document.getElementById(item.id);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [items]);

  return active;
}

function TocList({ items, active }: { items: TocItem[]; active: string }) {
  return (
    <ol className="space-y-1">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className={cn(
              "block truncate rounded-md py-1.5 text-sm transition-[background-color,color] duration-150",
              item.level === 3 ? "pl-4" : "pl-2",
              active === item.id
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

export function ArticleToc({ items }: { items: TocItem[] }) {
  const active = useActiveHeading(items);
  if (items.length === 0) return null;
  return (
    <Card className="min-w-0 overflow-hidden shadow-md">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="font-sans text-sm">目录</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <ScrollArea className="max-h-80">
          <TocList items={items} active={active} />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function MobileToc({ items }: { items: TocItem[] }) {
  const active = useActiveHeading(items);
  if (items.length === 0) return null;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          className="fixed right-4 z-30 h-11 gap-1.5 shadow-md md:hidden bottom-[max(1.25rem,env(safe-area-inset-bottom))]"
          aria-label="打开目录"
        >
          <List className="size-4" />
          目录
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[min(100%,18rem)] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <SheetHeader>
          <SheetTitle>目录</SheetTitle>
        </SheetHeader>
        <TocList items={items} active={active} />
      </SheetContent>
    </Sheet>
  );
}
