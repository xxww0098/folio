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

export const CONSOLE_SECTIONS = [
  "dashboard",
  "posts",
  "comments",
  "files",
  "trash",
  "obsidian",
  "agent",
  "plans",
  "settings",
  "appearance",
  "members",
  "backup",
  "entrance",
  "storage",
] as const;

export type ConsoleSection = (typeof CONSOLE_SECTIONS)[number];

export function isConsoleSection(value: unknown): value is ConsoleSection {
  return typeof value === "string" && (CONSOLE_SECTIONS as readonly string[]).includes(value);
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
      { id: "settings", label: "设置", icon: Settings, section: "settings" },
    ],
  },
  {
    id: "look",
    label: "外观",
    items: [
      { id: "appearance", label: "主题", icon: Palette, section: "appearance" },
      { id: "links", label: "友链", icon: Link2, href: "/links" },
    ],
  },
  {
    id: "system",
    label: "系统",
    items: [
      { id: "members", label: "用户", icon: Users, section: "members" },
      { id: "backup", label: "备份", icon: Puzzle, section: "backup" },
    ],
  },
];

export const SECTION_META: Record<ConsoleSection, { label: string; icon: LucideIcon }> = {
  dashboard: { label: "仪表盘", icon: Gauge },
  posts: { label: "文章", icon: FileText },
  comments: { label: "评论", icon: MessageSquare },
  files: { label: "附件", icon: Folder },
  trash: { label: "回收站", icon: Trash2 },
  obsidian: { label: "Obsidian", icon: BookOpen },
  agent: { label: "Agent", icon: Bot },
  plans: { label: "会员", icon: Sparkles },
  settings: { label: "设置", icon: Settings },
  appearance: { label: "主题", icon: Palette },
  members: { label: "用户", icon: Users },
  backup: { label: "备份", icon: Puzzle },
  entrance: { label: "入口", icon: Eye },
  storage: { label: "存储", icon: Folder },
};

export const COMMAND_ITEMS: Array<{ id: string; label: string; hint: string; section?: ConsoleSection; href?: string }> =
  [
    { id: "dashboard", label: "仪表盘", hint: "总览与快捷入口", section: "dashboard" },
    { id: "posts", label: "文章", hint: "内容", section: "posts" },
    { id: "write", label: "创建文章", hint: "写作", href: "/write" },
    { id: "comments", label: "评论", hint: "内容", section: "comments" },
    { id: "files", label: "附件", hint: "内容", section: "files" },
    { id: "trash", label: "回收站", hint: "内容", section: "trash" },
    { id: "obsidian", label: "Obsidian", hint: "写作", section: "obsidian" },
    { id: "agent", label: "Agent", hint: "写作", section: "agent" },
    { id: "plans", label: "会员", hint: "写作", section: "plans" },
    { id: "settings", label: "设置", hint: "写作", section: "settings" },
    { id: "appearance", label: "主题", hint: "外观", section: "appearance" },
    { id: "links", label: "友链", hint: "外观", href: "/links" },
    { id: "members", label: "用户", hint: "系统", section: "members" },
    { id: "backup", label: "备份", hint: "系统", section: "backup" },
    { id: "site", label: "查看站点", hint: "前台", href: "/" },
    { id: "me", label: "个人中心", hint: "账户", href: "/me" },
  ];
