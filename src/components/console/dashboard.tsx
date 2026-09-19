import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  Eye,
  FileText,
  Folder,
  MessageSquare,
  Palette,
  Play,
  RefreshCw,
  UserRound,
  Users,
  AppWindow,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { formatRelative } from "@/lib/format";
import type { AuthorDashboard } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import type { WorkspaceArea } from "@/lib/workspace";
import { workspacePath } from "@/lib/workspace";
import { EmptyInboxBox } from "./empty-box";
import type { ConsoleSection } from "./nav";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-console-sidebar px-5 py-5 shadow-[0_1px_2px_var(--color-console-shadow)]">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-console-icon text-console-nav">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-console-muted">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-console-ink">{value}</p>
      </div>
    </div>
  );
}

type QuickItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  section?: ConsoleSection;
  href?: string;
  play?: boolean;
};

const QUICK_CONSOLE: QuickItem[] = [
  { id: "me", label: "个人中心", icon: UserRound, href: "/me" },
  { id: "site", label: "查看站点", icon: AppWindow, href: "/" },
  { id: "write", label: "创建文章", icon: FileText, href: "/write" },
  { id: "comments", label: "评论管理", icon: MessageSquare, section: "comments" },
  { id: "files", label: "附件上传", icon: Folder, section: "files" },
  { id: "theme", label: "主题管理", icon: Palette, section: "appearance", play: true },
  { id: "obsidian", label: "Obsidian", icon: BookOpen, section: "obsidian" },
  { id: "members", label: "用户管理", icon: Users, section: "members" },
  { id: "refresh", label: "刷新数据", icon: RefreshCw },
];

const QUICK_ME: QuickItem[] = [
  { id: "site", label: "查看站点", icon: AppWindow, href: "/" },
  { id: "comments", label: "我的评论", icon: MessageSquare, section: "comments" },
  { id: "membership", label: "会员", icon: Sparkles, href: "/membership" },
  { id: "theme", label: "主题", icon: Palette, section: "appearance", play: true },
  { id: "settings", label: "账户设置", icon: UserRound, section: "settings" },
  { id: "refresh", label: "刷新数据", icon: RefreshCw },
];

export function ConsoleDashboard({
  area,
  dash,
  onRefresh,
  refreshing,
}: {
  area: WorkspaceArea;
  dash: AuthorDashboard;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const viewCount = dash.posts.reduce((sum, post) => sum + post.viewCount, 0);
  const userCount = Math.max(dash.members.length, 1);
  const home = workspacePath(area);
  const quick = area === "console" ? QUICK_CONSOLE : QUICK_ME;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {area === "console" ? (
          <>
            <StatCard icon={FileText} label="文章" value={dash.postCount} />
            <StatCard icon={Users} label="用户" value={userCount} />
            <StatCard icon={MessageSquare} label="评论" value={dash.commentCount} />
            <StatCard icon={Eye} label="浏览量" value={viewCount} />
          </>
        ) : (
          <>
            <StatCard icon={MessageSquare} label="我的评论" value={dash.commentCount} />
            <StatCard icon={Eye} label="点过的赞" value={dash.likeCount} />
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.85fr)]">
        <section className="rounded-xl bg-console-sidebar p-5 shadow-[0_1px_2px_var(--color-console-shadow)]">
          <h2 className="text-sm font-medium text-console-ink">快捷访问</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quick.map((item) => {
              const Icon = item.icon;
              const inner = (
                <>
                  <div className="flex items-start justify-between">
                    <span className="relative grid size-10 place-items-center rounded-xl bg-console-mint-soft text-console-mint">
                      <Icon className="size-5" />
                      {item.play ? (
                        <span className="absolute -right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-console-sidebar text-console-nav shadow-[0_1px_2px_var(--color-console-shadow)]">
                          <Play className="size-3 fill-current" />
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight className="size-4 text-console-line" />
                  </div>
                  <p className="mt-8 text-sm text-console-ink">{item.label}</p>
                </>
              );
              const className =
                "console-quick-tile flex min-h-32 flex-col rounded-xl bg-console-quick px-4 py-4 text-left transition-colors duration-150 hover:bg-console-mint-soft/70";
              if (item.id === "refresh") {
                return (
                  <button key={item.id} type="button" onClick={onRefresh} className={className}>
                    {inner}
                  </button>
                );
              }
              if (item.href === "/me") {
                return (
                  <Link key={item.id} to="/me" className={className}>
                    {inner}
                  </Link>
                );
              }
              if (item.href === "/write") {
                return (
                  <Link key={item.id} to="/write" className={className}>
                    {inner}
                  </Link>
                );
              }
              if (item.href === "/membership") {
                return (
                  <Link key={item.id} to="/membership" className={className}>
                    {inner}
                  </Link>
                );
              }
              if (item.href === "/") {
                return (
                  <Link key={item.id} to="/" className={className}>
                    {inner}
                  </Link>
                );
              }
              return (
                <Link key={item.id} to={home} search={{ section: item.section ?? "dashboard" }} className={className}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="flex min-h-80 flex-col rounded-xl bg-console-sidebar p-5 shadow-[0_1px_2px_var(--color-console-shadow)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-console-ink">通知</h2>
            <Link
              to={home}
              search={{ section: "comments" }}
              className="text-sm text-console-muted hover:text-console-ink"
            >
              查看全部
            </Link>
          </div>
          {dash.comments.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8">
              <EmptyInboxBox />
              <p className="mt-2 text-sm text-console-nav">当前没有未读的消息</p>
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="mt-5 h-9 rounded-lg border border-console-line px-4 text-sm text-console-ink transition-colors duration-150 hover:bg-console-active"
              >
                {refreshing ? "刷新中…" : "刷新"}
              </button>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-console-line">
              {dash.comments.slice(0, 6).map((comment) => (
                <li key={comment.id} className="py-3">
                  <p className="text-sm">
                    <span className="font-medium">{comment.authorName}</span>
                    <span className="text-console-muted"> 评论了 </span>
                    <Link
                      to="/posts/$slug"
                      params={{ slug: comment.postSlug }}
                      className="text-console-brand hover:underline"
                    >
                      {comment.postTitle}
                    </Link>
                  </p>
                  <p className={cn("mt-1 line-clamp-2 text-sm text-console-nav")}>{comment.body}</p>
                  <p className="mt-1 text-xs text-console-muted">{formatRelative(comment.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
