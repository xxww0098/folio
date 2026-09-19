import { useEffect, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import type { PostListItem } from "@/lib/blog/types";
import type { Role } from "@/lib/roles";
import type { WorkspaceArea } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ConsoleCommand } from "./command";
import { SECTION_META, type ConsoleSection } from "./nav";
import { ConsoleBrand, ConsoleSidebar } from "./sidebar";
import { VisitSiteLink } from "./visit-site";

export function ConsoleShell({
  area,
  section,
  userName,
  role,
  posts,
  onRefresh,
  children,
}: {
  area: WorkspaceArea;
  section: ConsoleSection;
  userName: string;
  role: Role | null;
  posts: PostListItem[];
  onRefresh: () => void;
  children: ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = SECTION_META[section];
  const TitleIcon = meta.icon;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      event.preventDefault();
      setSearchOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const writing = section === "write";

  return (
    <div className="console-app flex h-dvh overflow-hidden" data-console="">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-console-line lg:block">
        <ConsoleSidebar
          area={area}
          section={section}
          onOpenSearch={() => setSearchOpen(true)}
          userName={userName}
          role={role}
          onRefresh={onRefresh}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 px-4 sm:px-6">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="打开菜单"
                className="grid size-10 place-items-center rounded-lg text-console-nav hover:bg-console-sidebar lg:hidden"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 bg-console-sidebar p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>{area === "console" ? "控制台" : "个人中心"}</SheetTitle>
              </SheetHeader>
              <ConsoleSidebar
                area={area}
                section={section}
                onOpenSearch={() => {
                  setMenuOpen(false);
                  setSearchOpen(true);
                }}
                userName={userName}
                role={role}
                onRefresh={onRefresh}
              />
            </SheetContent>
          </Sheet>

          <div className="lg:hidden">
            <ConsoleBrand area={area} />
          </div>

          <div className="hidden items-center gap-2 text-console-ink lg:flex">
            <TitleIcon className="size-4 text-console-nav" />
            <h1 className="text-sm font-medium">{meta.label}</h1>
          </div>

          <VisitSiteLink className="ml-auto h-9 rounded-lg border border-console-line px-3 hover:bg-console-active" />
        </header>

        <main
          className={cn(
            "min-h-0 flex-1",
            writing ? "flex flex-col overflow-hidden p-0" : "overflow-y-auto px-4 pb-10 sm:px-6",
          )}
        >
          {writing ? null : (
            <h1 className="mx-auto mb-4 flex w-full max-w-5xl items-center gap-2 text-sm font-medium text-console-ink lg:hidden">
              <TitleIcon className="size-4 text-console-nav" />
              {meta.label}
            </h1>
          )}
          <div className={writing ? "flex min-h-0 flex-1 flex-col" : "mx-auto w-full max-w-5xl"}>{children}</div>
          {writing ? null : <p className="mt-10 text-center text-xs text-console-muted">Powered by 折页 Folio</p>}
        </main>
      </div>

      <ConsoleCommand area={area} role={role} open={searchOpen} onOpenChange={setSearchOpen} posts={posts} />
    </div>
  );
}
