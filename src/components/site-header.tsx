import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { AccountSlot } from "@/components/account-slot";
import { FolioMark } from "@/components/folio-mark";
import { SearchDialog } from "@/components/search-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { PostListItem } from "@/lib/blog/types";
import { DEFAULT_FRONT_PAGES, type FrontPage, type FrontPageFlags } from "@/lib/pages/visibility";
import { cn } from "@/lib/utils";

const NAV: Array<{ to: "/" | "/moments" | "/photos" | "/archive" | "/links" | "/about"; label: string; page?: FrontPage }> = [
  { to: "/", label: "首页" },
  { to: "/moments", label: "瞬间", page: "moments" },
  { to: "/photos", label: "图库", page: "photos" },
  { to: "/archive", label: "归档", page: "archive" },
  { to: "/links", label: "友链", page: "links" },
  { to: "/about", label: "关于" },
];

export function SiteHeader({ posts, pages = DEFAULT_FRONT_PAGES }: { posts: PostListItem[]; pages?: FrontPageFlags }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV.filter((item) => !item.page || pages[item.page]);

  return (
    <header className="sticky top-0 z-40 border-b border-header-foreground/10 bg-header text-header-foreground">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 lg:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <FolioMark className="size-5" />
          </span>
          <span className="font-display text-base font-semibold tracking-tight">折页</span>
        </Link>

        <nav className="ml-2 hidden items-center md:flex">
          {items.map((item) => {
            const active =
              item.to === "/"
                ? pathname === "/"
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
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
            <SheetContent>
              <SheetHeader>
                <SheetTitle>菜单</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1">
                {items.map((item) => (
                  <SheetTrigger key={item.to} asChild>
                    <Link
                      to={item.to}
                      className="flex h-12 items-center rounded-md px-3 text-base hover:bg-secondary"
                    >
                      {item.label}
                    </Link>
                  </SheetTrigger>
                ))}
              </nav>
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
