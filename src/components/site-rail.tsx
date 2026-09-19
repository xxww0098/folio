import { Link, useRouterState } from "@tanstack/react-router";
import { Archive, FolderOpen, Home, ImageIcon, Info, Link2, Rss, Sparkles, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { FrontPageFlags } from "@/lib/pages/visibility";
import { siteNavActive, visibleSiteNav, type SiteNavTo } from "@/lib/site-nav";
import { cn } from "@/lib/utils";

const ICONS: Record<SiteNavTo, LucideIcon> = {
  "/": Home,
  "/moments": Sparkles,
  "/photos": ImageIcon,
  "/archive": Archive,
  "/links": Link2,
  "/about": Info,
};

export function SiteRail({ pages, topics = [] }: { pages: FrontPageFlags; topics?: string[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = visibleSiteNav(pages);

  return (
    <aside className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] self-start overflow-y-auto lg:block">
      <Card className="min-w-0 overflow-hidden shadow-md">
        <CardContent className="p-3">
          <p className="px-2 pb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">页面</p>
          <nav className="flex flex-col gap-0.5">
            {items.map((item) => {
              const Icon = ICONS[item.to];
              const active = siteNavActive(pathname, item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-md px-2 text-sm transition-colors",
                    active
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {topics.length ? (
            <>
              <Separator className="my-3" />
              <p className="px-2 pb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">分类</p>
              <nav className="flex flex-col gap-0.5">
                {topics.map((topic) => {
                  const active = pathname === `/topics/${topic}` || pathname.startsWith(`/topics/${topic}/`);
                  return (
                    <Link
                      key={topic}
                      to="/topics/$topic"
                      params={{ topic }}
                      className={cn(
                        "flex h-9 items-center gap-2 rounded-md px-2 text-sm transition-colors",
                        active
                          ? "bg-secondary font-medium text-foreground"
                          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                      )}
                    >
                      <FolderOpen className="size-4 shrink-0" />
                      <span className="min-w-0 truncate font-mono text-[13px]">{topic}</span>
                    </Link>
                  );
                })}
              </nav>
            </>
          ) : null}

          <Separator className="my-3" />
          <a
            href="/rss.xml"
            className="flex h-9 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
          >
            <Rss className="size-4 shrink-0" />
            RSS
          </a>
        </CardContent>
      </Card>
    </aside>
  );
}
