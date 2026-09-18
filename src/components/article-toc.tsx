import type { TocItem } from "@/lib/blog/markdown";
import { cn } from "@/lib/utils";

export function ArticleToc({ items }: { items: TocItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav className="overflow-hidden rounded-xl bg-card p-4 shadow-md">
      <h3 className="mb-3 text-sm font-semibold">目录</h3>
      <ol className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "block rounded-md py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground",
                item.level === 3 ? "pl-4" : "pl-2",
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
