import { Link, useRouterState } from "@tanstack/react-router";
import { FolderOpen, Menu, Rss } from "lucide-react";
import { AccountSlot } from "@/components/account-slot";
import { FolioMark } from "@/components/folio-mark";
import { SearchDialog } from "@/components/search-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { PostListItem } from "@/lib/blog/types";
import { DEFAULT_FRONT_PAGES, type FrontPageFlags } from "@/lib/pages/visibility";
import { siteNavActive, visibleSiteNav } from "@/lib/site-nav";
import { cn } from "@/lib/utils";

export function SiteHeader({
  posts,
  pages = DEFAULT_FRONT_PAGES,
  topics = [],
}: {
  posts: PostListItem[];
  pages?: FrontPageFlags;
  topics?: string[];
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = visibleSiteNav(pages);

  return (
    <header className="sticky top-0 z-40 border-b border-header-foreground/10 bg-header pt-[env(safe-area-inset-top)] text-header-foreground">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-1 px-3 sm:h-16 sm:gap-2 sm:px-4 lg:px-6">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FolioMark className="size-4" />
          </span>
          <span className="font-display text-base font-semibold tracking-tight">折页</span>
        </Link>

        <nav className="ml-2 hidden items-center md:flex lg:hidden">
          {items.map((item) => {
            const active = siteNavActive(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "folio-nav-link inline-flex h-11 shrink-0 items-center px-2.5 text-sm transition-[color] duration-150",
                  active
                    ? "font-medium text-header-foreground"
                    : "text-header-foreground/70 hover:text-header-foreground",
                )}
                data-active={active ? "true" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center">
          <SearchDialog posts={posts} />
          <ThemeToggle />
          <div className="hidden md:block">
            <AccountSlot />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="打开菜单"
                className="text-header-foreground hover:bg-header-foreground/10 md:hidden"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(100%,18rem)] pt-[max(1.5rem,env(safe-area-inset-top))]">
              <SheetHeader>
                <SheetTitle>菜单</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1">
                {items.map((item) => {
                  const active = siteNavActive(pathname, item.to);
                  return (
                    <SheetTrigger key={item.to} asChild>
                      <Button
                        asChild
                        variant="ghost"
                        className={cn("h-12 justify-start px-3 text-base", active && "bg-secondary font-medium")}
                      >
                        <Link to={item.to}>{item.label}</Link>
                      </Button>
                    </SheetTrigger>
                  );
                })}
              </nav>
              {topics.length ? (
                <>
                  <Separator className="my-4" />
                  <p className="px-3 pb-2 text-xs text-muted-foreground">分类</p>
                  <nav className="flex flex-col gap-1">
                    {topics.map((topic) => (
                      <SheetTrigger key={topic} asChild>
                        <Button asChild variant="ghost" className="h-11 justify-start gap-2 px-3">
                          <Link to="/topics/$topic" params={{ topic }}>
                            <FolderOpen className="size-4 shrink-0" />
                            <span className="truncate font-mono text-sm">{topic}</span>
                          </Link>
                        </Button>
                      </SheetTrigger>
                    ))}
                  </nav>
                </>
              ) : null}
              <Separator className="my-4" />
              <Button asChild variant="ghost" className="h-11 w-full justify-start gap-2 px-3">
                <a href="/rss.xml">
                  <Rss className="size-4" />
                  RSS
                </a>
              </Button>
              <div className="mt-6">
                <AccountSlot tone="default" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
