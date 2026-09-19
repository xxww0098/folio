import { getSql } from "@/lib/db";
import { upsertPostBySlug } from "@/lib/blog/server";
import { TOPICS, type PostDetail, type Topic } from "@/lib/blog/types";
import { EMPTY_WIKI } from "@/lib/blog/wikilink";
import { attachTags } from "@/lib/blog/extras";
import { buildAccessGate, listAccessFromRow } from "@/lib/membership/server";
import {
  absolutizeMarkdown,
  excerptFrom,
  serializeNote,
  splitFrontMatter,
  topicFromMatter,
  type FolioMatter,
} from "./matter";

export type SyncResult = {
  id: number;
  slug: string;
  created: boolean;
  status: "draft" | "published";
  url: string;
  markdown: string;
};

export async function publishMarkdown(
  userId: string,
  markdown: string,
  origin: string,
  options?: { status?: "draft" | "published" },
): Promise<SyncResult> {
  const { matter, body } = splitFrontMatter(markdown);
  const title = (matter.title ?? "").trim() || firstHeading(body) || "未命名笔记";
  const slugHint = matter.folio?.name || matter.slug;
  const topic = topicFromMatter(matter, TOPICS[0] as Topic);
  const status =
    options?.status ?? matter.status ?? (matter.folio?.publish === false ? "draft" : "published");
  const cover = firstCover(matter, body);
  const result = await upsertPostBySlug({
    userId,
    slug: slugHint,
    title,
    excerpt: excerptFrom(matter, body),
    body,
    topic,
    coverImage: cover,
    coverAlt: title,
    status,
    tags: matter.tags,
    accessMode: matter.access,
    exclusiveDays: matter.exclusiveDays,
  });
  const detail = await loadDetail(result.id);
  const next = serializeNote(toMatter(detail, origin), detail.body);
  return { ...result, status, url: `${origin}/posts/${result.slug}`, markdown: next };
}

export async function listSyncPosts(userId: string, canEditAll: boolean) {
  const sql = await getSql();
  const rows = canEditAll
    ? await sql.query<{ id: number; slug: string; title: string; topic: string; status: string; updated_at: string }>(
        `select id, slug, title, topic, status, updated_at from posts where deleted_at is null order by updated_at desc`,
      )
    : await sql.query<{ id: number; slug: string; title: string; topic: string; status: string; updated_at: string }>(
        `select id, slug, title, topic, status, updated_at from posts where user_id = $1 and deleted_at is null order by updated_at desc`,
        [userId],
      );
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    topic: row.topic,
    status: row.status,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : new Date(row.updated_at).toISOString(),
  }));
}

export async function pullMarkdown(
  userId: string,
  slug: string,
  origin: string,
  canEditAll: boolean,
): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql.query<{ id: number; user_id: string }>(
    `select id, user_id from posts where slug = $1 and deleted_at is null limit 1`,
    [slug],
  );
  const row = rows[0];
  if (!row) return null;
  if (row.user_id !== userId && !canEditAll) return null;
  const detail = await loadDetail(row.id);
  return serializeNote(toMatter(detail, origin), absolutizeMarkdown(detail.body, origin));
}

function toMatter(post: PostDetail, origin: string): FolioMatter {
  const cover = post.coverImage
    ? post.coverImage.startsWith("/") && origin
      ? `${origin}${post.coverImage}`
      : post.coverImage
    : undefined;
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    cover,
    topic: post.topic,
    categories: [post.topic],
    tags: post.tags.map((tag) => tag.name),
    status: post.status,
    access: post.accessMode,
    exclusiveDays: post.exclusiveDays,
    folio: {
      site: origin,
      name: post.slug,
      publish: post.status === "published",
    },
  };
}

async function loadDetail(id: number): Promise<PostDetail> {
  const sql = await getSql();
  const rows = await sql.query<{
    id: number;
    user_id: string;
    author_name: string;
    slug: string;
    title: string;
    excerpt: string;
    body: string;
    cover_image: string | null;
    cover_alt: string | null;
    topic: string;
    status: "draft" | "published";
    reading_minutes: number;
    featured: boolean;
    view_count: number;
    allow_comments: boolean;
    access_mode: string | null;
    exclusive_days: number | null;
    published_at: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `select id, user_id, author_name, slug, title, excerpt, body, cover_image, cover_alt, topic, status,
            reading_minutes, featured, view_count, allow_comments, access_mode, exclusive_days, published_at, created_at, updated_at
     from posts where id = $1 limit 1`,
    [id],
  );
  const row = rows[0];
  if (!row) throw new Error("找不到这篇文章");
  const accessFields = listAccessFromRow({
    access_mode: row.access_mode,
    exclusive_days: row.exclusive_days,
    published_at: row.published_at,
  });
  const [post] = await attachTags(sql, [
    {
      id: row.id,
      userId: row.user_id,
      authorName: row.author_name,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      coverImage: row.cover_image,
      coverAlt: row.cover_alt,
      topic: row.topic,
      status: row.status,
      readingMinutes: row.reading_minutes,
      featured: Boolean(row.featured),
      commentCount: 0,
      likeCount: 0,
      viewCount: Number(row.view_count ?? 0),
      allowComments: row.allow_comments !== false,
      accessMode: accessFields.accessMode,
      exclusiveDays: accessFields.exclusiveDays,
      publicAt: accessFields.publicAt,
      exclusive: accessFields.exclusive,
      tags: [],
      publishedAt: row.published_at,
      createdAt: typeof row.created_at === "string" ? row.created_at : new Date(row.created_at).toISOString(),
      updatedAt: typeof row.updated_at === "string" ? row.updated_at : new Date(row.updated_at).toISOString(),
    },
  ]);
  const access = buildAccessGate({
    mode: post.accessMode,
    exclusiveDays: post.exclusiveDays,
    publishedAt: post.publishedAt,
    isPaid: true,
    isStaff: true,
    signedIn: true,
  });
  return { ...post, body: row.body, access, wiki: EMPTY_WIKI };
}

function firstHeading(body: string) {
  const match = /^#\s+(.+)$/m.exec(body);
  return match?.[1]?.trim();
}

function firstCover(matter: FolioMatter, body: string) {
  if (matter.cover?.trim()) return matter.cover.trim();
  const image = /!\[[^\]]*\]\(([^)]+)\)/.exec(body);
  return image?.[1]?.trim() || null;
}
