import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CornerDownLeft, GitFork, Unlink } from "lucide-react";
import type { WikiGraph, WikiMention } from "@/lib/blog/wikilink";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ArticleWiki({
  wiki,
}: {
  wiki: WikiGraph;
  title: string;
}) {
  const hasGraph = wiki.outgoing.length || wiki.backlinks.length || wiki.unlinked.length || wiki.unresolved.length;
  if (!hasGraph) return null;

  return (
    <Card className="min-w-0 overflow-hidden shadow-md">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 font-sans text-sm">
          <GitFork className="size-3.5 shrink-0 text-primary" />
          双链
        </CardTitle>
        <CardDescription>文章互相引用。点出去，也能从反向链接走回来。</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 overflow-hidden p-4 pt-0">
        <Accordion type="multiple" defaultValue={[]} className="w-full min-w-0">
          <WikiGroup value="outgoing" icon={ArrowUpRight} label="出链" items={wiki.outgoing} empty="这篇还没有指向其他文章。" />
          <WikiGroup value="backlinks" icon={CornerDownLeft} label="反向链接" items={wiki.backlinks} empty="还没有文章链到这里。" />
          {wiki.unlinked.length ? <WikiGroup value="unlinked" icon={Unlink} label="未链提及" items={wiki.unlinked} /> : null}
          {wiki.unresolved.length ? (
            <AccordionItem value="unresolved">
              <AccordionTrigger className="text-xs font-medium text-muted-foreground">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  未对应
                  <Badge variant="secondary" className="tabular-nums">
                    {wiki.unresolved.length}
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="min-w-0 space-y-1">
                  {wiki.unresolved.map((name) => (
                    <li key={name} className="truncate text-sm text-muted-foreground" title="库里还没有这篇">
                      {name}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ) : null}
        </Accordion>
      </CardContent>
    </Card>
  );
}

function WikiGroup({
  value,
  icon: Icon,
  label,
  items,
  empty,
}: {
  value: string;
  icon: typeof ArrowUpRight;
  label: string;
  items: WikiMention[];
  empty?: string;
}) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="text-xs font-medium text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Icon className="size-3 shrink-0" />
          {label}
          {items.length ? (
            <Badge variant="secondary" className="tabular-nums">
              {items.length}
            </Badge>
          ) : null}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        {items.length ? (
          <ul className="min-w-0 space-y-2">
            {items.map((item) => (
              <li key={`${item.slug}-${item.heading ?? ""}-${item.snippet}`} className="min-w-0">
                <Link
                  to="/posts/$slug"
                  params={{ slug: item.slug }}
                  hash={item.headingId}
                  className="block min-w-0 overflow-hidden rounded-md py-0.5 hover:bg-secondary"
                >
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  {item.heading ? <span className="block truncate text-xs text-primary"># {item.heading}</span> : null}
                  {item.snippet ? (
                    <span className="mt-0.5 block line-clamp-2 break-words text-xs leading-relaxed text-muted-foreground">
                      {item.snippet}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : empty ? (
          <p className="text-xs text-muted-foreground">{empty}</p>
        ) : null}
      </AccordionContent>
    </AccordionItem>
  );
}
