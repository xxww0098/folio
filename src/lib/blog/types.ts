import type { MemberRow, Role } from "@/lib/roles";
import type { AccessGate, AccessMode } from "@/lib/membership/access";
import type { FrontPageFlags } from "@/lib/pages/visibility";
import type { WikiGraph } from "./wikilink";

export const DEFAULT_TOPICS = ["TypeScript", "Rust", "Go", "Python", "SQL", "Zig", "架构"] as const;
export const TOPICS = DEFAULT_TOPICS;
export type Topic = string;

export const POST_STATUSES = ["draft", "published"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export type TagRef = {
  name: string;
  slug: string;
};

export type PostListItem = {
  id: number;
  userId: string;
  authorName: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  coverAlt: string | null;
  topic: string;
  status: PostStatus;
  readingMinutes: number;
  featured: boolean;
  commentCount: number;
  likeCount: number;
  viewCount: number;
  allowComments: boolean;
  accessMode: AccessMode;
  exclusiveDays: number;
  publicAt: string | null;
  exclusive: boolean;
  tags: TagRef[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PostDetail = PostListItem & {
  body: string;
  access: AccessGate;
  wiki: WikiGraph;
};

export type CommentItem = {
  id: number;
  postId: number;
  userId: string;
  authorName: string;
  body: string;
  parentId: number | null;
  createdAt: string;
};

export type RecentComment = {
  id: number;
  authorName: string;
  body: string;
  createdAt: string;
  postTitle: string;
  postSlug: string;
};

export type InboxComment = CommentItem & {
  postTitle: string;
  postSlug: string;
};

export type PostRevision = {
  id: number;
  postId: number;
  title: string;
  excerpt: string;
  body: string;
  editorName: string;
  createdAt: string;
};

export type AuthorDashboard = {
  role: Role;
  postCount: number;
  draftCount: number;
  publishedCount: number;
  commentCount: number;
  likeCount: number;
  posts: PostListItem[];
  comments: InboxComment[];
  trash: PostListItem[];
  members: MemberRow[];
};

export type PostInput = {
  title: string;
  excerpt: string;
  body: string;
  topic: string;
  coverImage?: string | null;
  coverAlt?: string | null;
  status: PostStatus;
  tags?: string[];
  allowComments?: boolean;
  accessMode?: AccessMode;
  exclusiveDays?: number;
};

export type SiteChrome = {
  posts: PostListItem[];
  tags: Array<TagRef & { count: number }>;
  recentComments: RecentComment[];
  pages: FrontPageFlags;
  topics: string[];
};

export function isTopic(value: string, allowed: readonly string[] = DEFAULT_TOPICS): value is Topic {
  return allowed.includes(value);
}

export function readingMinutesFromBody(body: string): number {
  const chars = body.replace(/\s+/g, "").length;
  return Math.max(1, Math.round(chars / 380));
}

export function makeSlug(title: string): string {
  const compact = title
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
  const stamp = Date.now().toString(36);
  return compact ? `${compact}-${stamp}` : `essay-${stamp}`;
}

export function makeStableSlug(title: string, explicit?: string): string {
  const source = (explicit ?? title).trim().toLowerCase();
  const compact = source
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return compact || `note-${Date.now().toString(36)}`;
}

export function makeTagSlug(name: string): string {
  const compact = name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return compact || "tag";
}
