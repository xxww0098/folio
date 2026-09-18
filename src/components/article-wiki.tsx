import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CornerDownLeft, GitFork, Unlink } from "lucide-react";
import type { WikiGraph, WikiMention } from "@/lib/blog/wikilink";

export function ArticleWiki({
  wiki,
  title,
}: {
  wiki: WikiGraph;
  title: string;
}) {
  const hasGraph = wiki.outgoing.length || wiki.backlinks.length || wiki.unlinked.length || wiki.unresolved.length;
  if (!hasGraph) return null;

  return (
    <nav className="overflow-hidden rounded-xl bg-card p-4 shadow-md">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <GitFork className="size-3.5 text-primary" />
        双链
      </h3>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">文章互相引用。点出去，也能从反向链接走回来。</p>
      <LocalGraph title={title} outgoing={wiki.outgoing} backlinks={wiki.backlinks} />
      <WikiGroup icon={ArrowUpRight} label="出链" items={wiki.outgoing} empty="这篇还没有指向其他文章。" />
      <WikiGroup icon={CornerDownLeft} label="反向链接" items={wiki.backlinks} empty="还没有文章链到这里。" />
      {wiki.unlinked.length ? <WikiGroup icon={Unlink} label="未链提及" items={wiki.unlinked} /> : null}
      {wiki.unresolved.length ? (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">未对应</p>
          <ul className="mt-1 space-y-1">
            {wiki.unresolved.map((name) => (
              <li key={name} className="truncate text-sm text-muted-foreground" title="库里还没有这篇">
                {name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}

function LocalGraph({
  title,
  outgoing,
  backlinks,
}: {
  title: string;
  outgoing: WikiMention[];
  backlinks: WikiMention[];
}) {
  if (!outgoing.length && !backlinks.length) return null;
  const left = backlinks.slice(0, 3);
  const right = outgoing.slice(0, 3);
  return (
    <div className="mb-3 rounded-lg bg-secondary/70 px-3 py-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
        <div className="space-y-1">
          {left.length ? (
            left.map((item) => (
              <Link
                key={item.slug}
                to="/posts/$slug"
                params={{ slug: item.slug }}
                className="block truncate text-muted-foreground hover:text-primary"
              >
                {item.title}
              </Link>
            ))
          ) : (
            <span className="text-muted-foreground/60">无反向</span>
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="max-w-24 truncate rounded-md bg-primary px-2 py-1 text-center text-xs font-medium text-primary-foreground">
            {title}
          </span>
        </div>
        <div className="space-y-1 text-right">
          {right.length ? (
            right.map((item) => (
              <Link
                key={`${item.slug}-${item.heading ?? ""}`}
                to="/posts/$slug"
                params={{ slug: item.slug }}
                hash={item.headingId}
                className="block truncate text-muted-foreground hover:text-primary"
              >
                {item.alias || item.title}
              </Link>
            ))
          ) : (
            <span className="text-muted-foreground/60">无出链</span>
          )}
        </div>
      </div>
    </div>
  );
}

function WikiGroup({
  icon: Icon,
  label,
  items,
  empty,
}: {
  icon: typeof ArrowUpRight;
  label: string;
  items: WikiMention[];
  empty?: string;
}) {
  return (
    <div className="mt-3 border-t border-border pt-3 first:mt-0 first:border-t-0 first:pt-0">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3" />
        {label}
        {items.length ? <span className="tabular-nums">{items.length}</span> : null}
      </p>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={`${item.slug}-${item.heading ?? ""}-${item.snippet}`}>
              <Link
                to="/posts/$slug"
                params={{ slug: item.slug }}
                hash={item.headingId}
                className="block rounded-md py-0.5 hover:bg-secondary"
              >
                <span className="block truncate text-sm font-medium">{item.title}</span>
                {item.heading ? <span className="block truncate text-xs text-primary"># {item.heading}</span> : null}
                {item.snippet ? (
                  <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.snippet}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : empty ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : null}
    </div>
  );
}
