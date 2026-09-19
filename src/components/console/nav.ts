import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Bot,
  Eye,
  FileText,
  Folder,
  Gauge,
  Link2,
  MessageSquare,
  Palette,
  Puzzle,
  Settings,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import type { Role } from "@/lib/roles";
import type { WorkspaceArea } from "@/lib/workspace";

export const CONSOLE_SECTIONS = [
  "dashboard",
  "posts",
  "write",
  "comments",
  "files",
  "trash",
  "obsidian",
  "agent",
  "plans",
  "settings",
  "appearance",
  "links",
  "members",
  "backup",
  "entrance",
  "storage",
] as const;

export type ConsoleSection = (typeof CONSOLE_SECTIONS)[number];

export const ME_SECTIONS = ["dashboard", "comments", "appearance", "settings"] as const;

export type MeSection = (typeof ME_SECTIONS)[number];

export const ADMIN_ONLY_SECTIONS: ConsoleSection[] = [
  "members",
  "plans",
  "backup",
  "entrance",
  "storage",
  "links",
];

export function isConsoleSection(value: unknown): value is ConsoleSection {
  return typeof value === "string" && (CONSOLE_SECTIONS as readonly string[]).includes(value);
}

export function isMeSection(value: unknown): value is MeSection {
  return typeof value === "string" && (ME_SECTIONS as readonly string[]).includes(value);
}

export type ConsoleNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  section?: ConsoleSection;
  href?: string;
};

export type ConsoleNavGroup = {
  id: string;
  label?: string;
  items: ConsoleNavItem[];
};

export const CONSOLE_NAV: ConsoleNavGroup[] = [
  {
    id: "home",
    items: [{ id: "dashboard", label: "仪表盘", icon: Gauge, section: "dashboard" }],
  },
  {
    id: "content",
    label: "内容",
    items: [
      { id: "posts", label: "文章", icon: FileText, section: "posts" },
      { id: "comments", label: "评论", icon: MessageSquare, section: "comments" },
      { id: "files", label: "附件", icon: Folder, section: "files" },
      { id: "trash", label: "回收站", icon: Trash2, section: "trash" },
    ],
  },
  {
    id: "tools",
    label: "写作",
    items: [
      { id: "obsidian", label: "Obsidian", icon: BookOpen, section: "obsidian" },
      { id: "agent", label: "Agent", icon: Bot, section: "agent" },
      { id: "plans", label: "会员", icon: Sparkles, section: "plans" },
    ],
  },
  {
    id: "look",
    label: "外观",
    items: [
      { id: "appearance", label: "主题", icon: Palette, section: "appearance" },
      { id: "links", label: "友链", icon: Link2, section: "links" },
    ],
  },
  {
    id: "system",
    label: "系统",
    items: [
      { id: "members", label: "用户", icon: Users, section: "members" },
      { id: "backup", label: "备份", icon: Puzzle, section: "backup" },
      { id: "settings", label: "设置", icon: Settings, section: "settings" },
    ],
  },
];

export const ME_NAV: ConsoleNavGroup[] = [
  {
    id: "home",
    items: [{ id: "dashboard", label: "仪表盘", icon: Gauge, section: "dashboard" }],
  },
  {
    id: "activity",
    label: "动态",
    items: [{ id: "comments", label: "我的评论", icon: MessageSquare, section: "comments" }],
  },
  {
    id: "account",
    label: "账户",
    items: [
      { id: "appearance", label: "主题", icon: Palette, section: "appearance" },
      { id: "membership", label: "会员", icon: Sparkles, href: "/membership" },
      { id: "settings", label: "设置", icon: Settings, section: "settings" },
    ],
  },
];

export const SECTION_META: Record<ConsoleSection, { label: string; icon: LucideIcon }> = {
  dashboard: { label: "仪表盘", icon: Gauge },
  posts: { label: "文章", icon: FileText },
  write: { label: "写文章", icon: FileText },
  comments: { label: "评论", icon: MessageSquare },
  files: { label: "附件", icon: Folder },
  trash: { label: "回收站", icon: Trash2 },
  obsidian: { label: "Obsidian", icon: BookOpen },
  agent: { label: "Agent", icon: Bot },
  plans: { label: "会员", icon: Sparkles },
  settings: { label: "设置", icon: Settings },
  appearance: { label: "主题", icon: Palette },
  links: { label: "友链", icon: Link2 },
  members: { label: "用户", icon: Users },
  backup: { label: "备份", icon: Puzzle },
  entrance: { label: "入口", icon: Eye },
  storage: { label: "存储", icon: Folder },
};

export type CommandItem = {
  id: string;
  label: string;
  hint: string;
  section?: ConsoleSection;
  href?: string;
};

export const CONSOLE_COMMAND_ITEMS: CommandItem[] = [
  { id: "dashboard", label: "仪表盘", hint: "总览与快捷入口", section: "dashboard" },
  { id: "posts", label: "文章", hint: "内容", section: "posts" },
  { id: "write", label: "写文章", hint: "内容", section: "write" },
  { id: "comments", label: "评论", hint: "内容", section: "comments" },
  { id: "files", label: "附件", hint: "内容", section: "files" },
  { id: "trash", label: "回收站", hint: "内容", section: "trash" },
  { id: "obsidian", label: "Obsidian", hint: "写作", section: "obsidian" },
  { id: "agent", label: "Agent", hint: "写作", section: "agent" },
  { id: "plans", label: "会员", hint: "系统", section: "plans" },
  { id: "settings", label: "设置", hint: "系统", section: "settings" },
  { id: "storage", label: "对象存储", hint: "系统", section: "settings" },
  { id: "appearance", label: "主题", hint: "外观", section: "appearance" },
  { id: "links", label: "友链", hint: "外观", section: "links" },
  { id: "members", label: "用户", hint: "系统", section: "members" },
  { id: "backup", label: "备份", hint: "系统", section: "backup" },
  { id: "site", label: "访问博客", hint: "新标签打开前台", href: "/" },
  { id: "me", label: "个人中心", hint: "账户", href: "/me" },
];

export const ME_COMMAND_ITEMS: CommandItem[] = [
  { id: "dashboard", label: "仪表盘", hint: "我的总览", section: "dashboard" },
  { id: "comments", label: "我的评论", hint: "动态", section: "comments" },
  { id: "appearance", label: "主题", hint: "账户", section: "appearance" },
  { id: "membership", label: "会员", hint: "账户", href: "/membership" },
  { id: "settings", label: "设置", hint: "账户", section: "settings" },
  { id: "site", label: "访问博客", hint: "新标签打开前台", href: "/" },
];

export const COMMAND_ITEMS = CONSOLE_COMMAND_ITEMS;

function filterAdminItems(groups: ConsoleNavGroup[], role: Role | null) {
  if (role === "admin") return groups;
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.section || !ADMIN_ONLY_SECTIONS.includes(item.section)),
    }))
    .filter((group) => group.items.length > 0);
}

export function navFor(area: WorkspaceArea, role: Role | null): ConsoleNavGroup[] {
  if (area === "me") return ME_NAV;
  return filterAdminItems(CONSOLE_NAV, role);
}

export function commandItemsFor(area: WorkspaceArea, role: Role | null): CommandItem[] {
  const items = area === "me" ? ME_COMMAND_ITEMS : CONSOLE_COMMAND_ITEMS;
  if (area === "me" || role === "admin") return items;
  return items.filter((item) => !item.section || !ADMIN_ONLY_SECTIONS.includes(item.section));
}
