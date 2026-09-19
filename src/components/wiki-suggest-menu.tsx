import { useEffect, useMemo, useState } from "react";
import { suggestWiki, type WikiSuggestHit } from "@/lib/blog/wiki-suggest";
import type { WikiCatalogItem } from "@/lib/blog/wikilink";
import { cn } from "@/lib/utils";

export function WikiSuggestMenu({
  query,
  catalog,
  exclude,
  onPick,
  onClose,
  className,
}: {
  query: string;
  catalog: WikiCatalogItem[];
  exclude?: string;
  onPick: (hit: WikiSuggestHit) => void;
  onClose?: () => void;
  className?: string;
}) {
  const hits = useMemo(
    () => suggestWiki(query, catalog.filter((item) => item.slug !== exclude)),
    [catalog, exclude, query],
  );
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (!hits.length) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((i) => (i + 1) % hits.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((i) => (i - 1 + hits.length) % hits.length);
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const hit = hits[active] ?? hits[0];
        if (hit) onPick(hit);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [active, hits, onClose, onPick]);

  if (!hits.length) {
    return (
      <div className={cn("rounded-lg border border-console-line bg-console-card p-3 text-sm text-console-muted shadow-lg", className)}>
        没有匹配的文章
      </div>
    );
  }

  return (
    <ul className={cn("max-h-64 overflow-y-auto rounded-lg border border-console-line bg-console-card py-1 shadow-lg", className)}>
      {hits.map((hit, index) => (
        <li key={`${hit.inner}-${index}`}>
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm",
              index === active ? "bg-secondary" : "hover:bg-secondary/70",
            )}
            onMouseEnter={() => setActive(index)}
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(hit);
            }}
          >
            <span className="min-w-0 truncate">{hit.label}</span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{hit.hint}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
