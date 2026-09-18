import { Link } from "@tanstack/react-router";
import { RefreshCw, Search, Shield, UserRound } from "lucide-react";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { FolioMark } from "@/components/folio-mark";
import { CONSOLE_NAV, type ConsoleSection } from "./nav";

export function ConsoleBrand() {
  return (
    <Link to="/console" search={{ section: "dashboard" }} className="flex items-center gap-2 px-1">
      <span className="grid size-8 place-items-center rounded-lg bg-console-brand text-console-sidebar">
        <FolioMark className="size-5" />
      </span>
      <span className="font-sans text-2xl font-bold leading-none tracking-tight text-console-brand">Folio</span>
    </Link>
  );
}

export function ConsoleSidebar({
  section,
  onOpenSearch,
  userName,
  role,
  onRefresh,
}: {
  section: ConsoleSection;
  onOpenSearch: () => void;
  userName: string;
  role: Role | null;
  onRefresh: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-console-sidebar">
      <div className="px-5 pb-3 pt-6">
        <ConsoleBrand />
        <button
          type="button"
          onClick={onOpenSearch}
          className="mt-5 flex h-10 w-full items-center gap-2 rounded-lg bg-console-active px-3 text-sm text-console-muted transition-colors duration-150 hover:bg-console-icon"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">搜索</span>
          <kbd className="rounded-md bg-console-sidebar px-1.5 py-0.5 font-sans text-xs text-console-muted">⌘K</kbd>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {CONSOLE_NAV.map((group) => (
          <div key={group.id} className={cn(group.label ? "mt-4" : "mt-1")}>
            {group.label ? (
              <p className="px-3 pb-1.5 text-xs text-console-muted">{group.label}</p>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = item.section === section;
                const Icon = item.icon;
                const className = cn(
                  "console-nav-item flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150",
                  active
                    ? "bg-console-active font-medium text-console-ink"
                    : "text-console-nav hover:bg-console-active hover:text-console-ink",
                );
                if (item.href) {
                  return (
                    <li key={item.id}>
                      <Link to="/links" className={className}>
                        <Icon className="size-4" />
                        {item.label}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={item.id}>
                    <Link
                      to="/console"
                      search={{ section: item.section ?? "dashboard" }}
                      data-active={active ? "true" : undefined}
                      className={className}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-2 border-t border-console-line px-4 py-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-console-ink">{userName}</p>
          {role ? (
            <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-console-active px-1.5 py-0.5 text-xs text-console-nav">
              <Shield className="size-3" />
              {role === "admin" ? "超级管理员" : ROLE_LABEL[role]}
            </span>
          ) : null}
        </div>
        <Link
          to="/me"
          aria-label="个人中心"
          className="grid size-9 place-items-center rounded-full text-console-nav hover:bg-console-active"
        >
          <UserRound className="size-4" />
        </Link>
        <button
          type="button"
          aria-label="刷新"
          onClick={onRefresh}
          className="grid size-9 place-items-center rounded-full text-console-nav hover:bg-console-active"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>
    </div>
  );
}
