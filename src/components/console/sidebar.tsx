import { Link } from "@tanstack/react-router";
import { RefreshCw, Search, Shield, UserRound } from "lucide-react";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { WorkspaceArea } from "@/lib/workspace";
import { workspacePath } from "@/lib/workspace";
import { FolioMark } from "@/components/folio-mark";
import { navFor, type ConsoleSection } from "./nav";
import { VisitSiteLink } from "./visit-site";

export function ConsoleBrand({ area }: { area: WorkspaceArea }) {
  const home = workspacePath(area);
  return (
    <Link to={home} search={{ section: "dashboard" }} className="flex items-center gap-2 px-1">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-console-brand text-console-sidebar">
        <FolioMark className="size-4" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-sans text-2xl font-bold tracking-tight text-console-brand">Folio</span>
        <span className="mt-1 text-[11px] text-console-muted">{area === "console" ? "控制台" : "个人中心"}</span>
      </span>
    </Link>
  );
}

export function ConsoleSidebar({
  area,
  section,
  onOpenSearch,
  userName,
  role,
  onRefresh,
}: {
  area: WorkspaceArea;
  section: ConsoleSection;
  onOpenSearch: () => void;
  userName: string;
  role: Role | null;
  onRefresh: () => void;
}) {
  const home = workspacePath(area);
  const groups = navFor(area, role);

  return (
    <div className="flex h-full flex-col bg-console-sidebar">
      <div className="px-5 pb-3 pt-6">
        <ConsoleBrand area={area} />
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
        {groups.map((group) => (
          <div key={group.id} className={cn(group.label ? "mt-4" : "mt-1")}>
            {group.label ? <p className="px-3 pb-1.5 text-xs text-console-muted">{group.label}</p> : null}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = item.section === section || (section === "write" && item.section === "posts");
                const Icon = item.icon;
                const className = cn(
                  "console-nav-item flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150",
                  active
                    ? "bg-console-active font-medium text-console-ink"
                    : "text-console-nav hover:bg-console-active hover:text-console-ink",
                );
                if (item.href === "/membership") {
                  return (
                    <li key={item.id}>
                      <Link to="/membership" className={className}>
                        <Icon className="size-4" />
                        {item.label}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={item.id}>
                    <Link
                      to={home}
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

      <div className="mt-auto border-t border-console-line px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-console-ink">{userName}</p>
            {role ? (
              <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-console-active px-1.5 py-0.5 text-xs text-console-nav">
                <Shield className="size-3" />
                {role === "admin" ? "超级管理员" : ROLE_LABEL[role]}
              </span>
            ) : null}
          </div>
          {area === "console" ? (
            <Link
              to="/me"
              aria-label="个人中心"
              title="个人中心"
              className="grid size-9 place-items-center rounded-full text-console-nav hover:bg-console-active"
            >
              <UserRound className="size-4" />
            </Link>
          ) : null}
          <button
            type="button"
            aria-label="刷新"
            onClick={onRefresh}
            className="grid size-9 place-items-center rounded-full text-console-nav hover:bg-console-active"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>
        <VisitSiteLink className="mt-3 h-9 w-full justify-center rounded-lg bg-console-active px-3 text-console-ink hover:bg-console-icon" />
      </div>
    </div>
  );
}
