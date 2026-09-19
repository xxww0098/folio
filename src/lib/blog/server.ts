import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { displayNameFor } from "@/lib/profile";
import { ensureAttachmentsSeeded } from "@/lib/attachments/server";
import { ensureLinksSeeded } from "@/lib/links/server";
import { getActor, parseRole, ROLES } from "@/lib/roles";
import { ensureMomentsSeeded } from "@/lib/moments/server";
import { EDITORIAL_NAME, EDITORIAL_USER_ID, SEED_POSTS, SEED_SLUG_MIGRATIONS } from "./seed";
import {
  applyBodyGate,
  buildAccessGate,
  getViewerFlags,
  listAccessFromRow,
} from "@/lib/membership/server";
import { clampExclusiveDays, isAccessMode, type AccessMode } from "@/lib/membership/access";
import { optionalAuthMiddleware } from "@/lib/membership/session";
import { getFrontPages } from "@/lib/pages/server";
import { DEFAULT_FRONT_PAGES } from "@/lib/pages/visibility";
import {
  attachTags,
  ensureSiteExtras,
  fetchRecentComments,
  fetchTagCloud,
  replacePostTags,
} from "./extras";
import { buildWikiGraph, extractHeadings, EMPTY_WIKI, type WikiCatalogItem, type WikiGraph } from "./wikilink";
import {
  isTopic,
  makeSlug,
  makeStableSlug,
  readingMinutesFromBody,
  type AuthorDashboard,
  type InboxComment,
  type PostDetail,
  type PostListItem,
  type PostRevision,
  type PostStatus,
  type SiteChrome,
} from "./types";

type PostRow = {
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
  status: PostStatus;
  reading_minutes: number;
  featured: boolean;
  comment_count: number;
  like_count: number;
  view_count: number;
  allow_comments: boolean;
  access_mode: string;
  exclusive_days: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function toListItem(row: PostRow): PostListItem {
  const access = listAccessFromRow(row);
  return {
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
    featured: row.featured,
    commentCount: Number(row.comment_count ?? 0),
    likeCount: Number(row.like_count ?? 0),
    viewCount: Number(row.view_count ?? 0),
    allowComments: row.allow_comments !== false,
    accessMode: access.accessMode,
    exclusiveDays: access.exclusiveDays,
    publicAt: access.publicAt,
    exclusive: access.exclusive,
    tags: [],
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_LIST = `
  select
    p.id, p.user_id, p.author_name, p.slug, p.title, p.excerpt, p.body,
    p.cover_image, p.cover_alt, p.topic, p.status, p.reading_minutes,
    p.featured, p.published_at, p.created_at, p.updated_at, p.view_count, p.allow_comments,
    p.access_mode, p.exclusive_days,
    (select count(*)::int from comments c where c.post_id = p.id) as comment_count,
    (select count(*)::int from post_likes l where l.post_id = p.id) as like_count
  from posts p
`;

type WikiNoteRow = { slug: string; title: string; body: string };

function noteToCatalog(row: WikiNoteRow): WikiCatalogItem {
  return {
    slug: row.slug,
    title: row.title,
    headings: extractHeadings(row.body).map((item) => ({ id: item.id, text: item.text })),
  };
}

async function loadWikiNotes(sql: Awaited<ReturnType<typeof getSql>>) {
  const rows = await sql.query<WikiNoteRow>(
    `select slug, title, body from posts where status = 'published' and deleted_at is null order by published_at desc`,
  );
  const notes = rows.map(noteToCatalog);
  const bodies: Record<string, string> = {};
  for (const row of rows) bodies[row.slug] = row.body;
  return { notes, bodies };
}

async function loadWiki(
  sql: Awaited<ReturnType<typeof getSql>>,
  current: { slug: string; title: string; body: string },
): Promise<WikiGraph> {
  const { notes, bodies } = await loadWikiNotes(sql);
  const catalog = notes.some((note) => note.slug === current.slug)
    ? notes
    : [...notes, noteToCatalog(current)];
  const allBodies = bodies[current.slug] ? bodies : { ...bodies, [current.slug]: current.body };
  if (!catalog.length) return { ...EMPTY_WIKI };
  return buildWikiGraph(current.slug, current.body, catalog, allBodies);
}

async function ensureSeeded() {
  const sql = await getSql();
  await ensureMomentsSeeded();
  await ensureLinksSeeded();
  await ensureAttachmentsSeeded();

  for (const post of SEED_POSTS) {
    const minutes = readingMinutesFromBody(post.body);
    const legacy = Object.entries(SEED_SLUG_MIGRATIONS).find(([, next]) => next === post.slug)?.[0];
    const found = legacy
      ? await sql.query<{ id: number }>(
          `select id from posts where user_id = $1 and (slug = $2 or slug = $3) limit 1`,
          [EDITORIAL_USER_ID, post.slug, legacy],
        )
      : await sql.query<{ id: number }>(
          `select id from posts where user_id = $1 and slug = $2 limit 1`,
          [EDITORIAL_USER_ID, post.slug],
        );
    if (found[0]) {
      const accessMode = post.accessMode ?? "public";
      const exclusiveDays = post.exclusiveDays ?? 7;
      await sql`
        update posts set
          slug = ${post.slug},
          title = ${post.title},
          excerpt = ${post.excerpt},
          body = ${post.body},
          cover_image = ${post.coverImage},
          cover_alt = ${post.coverAlt},
          topic = ${post.topic},
          reading_minutes = ${minutes},
          featured = ${post.featured},
          published_at = ${post.publishedAt},
          access_mode = ${accessMode},
          exclusive_days = ${exclusiveDays},
          updated_at = now()
        where id = ${found[0].id}
      `;
    } else {
      const accessMode = post.accessMode ?? "public";
      const exclusiveDays = post.exclusiveDays ?? 7;
      await sql`
        insert into posts (
          user_id, author_name, slug, title, excerpt, body,
          cover_image, cover_alt, topic, status, reading_minutes,
          featured, published_at, access_mode, exclusive_days
        ) values (
          ${EDITORIAL_USER_ID}, ${EDITORIAL_NAME}, ${post.slug}, ${post.title},
          ${post.excerpt}, ${post.body}, ${post.coverImage}, ${post.coverAlt},
          ${post.topic}, ${"published"}, ${minutes}, ${post.featured}, ${post.publishedAt},
          ${accessMode}, ${exclusiveDays}
        )
      `;
    }
  }
  await ensureSiteExtras();
}

function formatDate(value: Date | string | null): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function normalizeRow(row: PostRow): PostRow {
  return {
    ...row,
    published_at: formatDate(row.published_at),
    created_at: formatDate(row.created_at) ?? new Date().toISOString(),
    updated_at: formatDate(row.updated_at) ?? new Date().toISOString(),
    featured: Boolean(row.featured),
    allow_comments: row.allow_comments !== false,
    view_count: Number(row.view_count ?? 0),
    like_count: Number(row.like_count ?? 0),
    exclusive_days: Number(row.exclusive_days ?? 7),
    access_mode: row.access_mode || "public",
  };
}

async function requirePostAccess(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  postId: number,
  includeDeleted = false,
) {
  const actor = await getActor(userId);
  const rows = await sql.query<{
    id: number;
    user_id: string;
    slug: string;
    title: string;
    excerpt: string;
    body: string;
    status: PostStatus;
    published_at: string | null;
    deleted_at: string | null;
  }>(
    `select id, user_id, slug, title, excerpt, body, status, published_at, deleted_at from posts where id = $1 ${
      includeDeleted ? "" : "and deleted_at is null"
    }`,
    [postId],
  );
  const row = rows[0];
  if (!row) throw new Error("找不到这篇稿件");
  if (row.user_id !== userId && !actor.canEditAll) throw new Error("没有权限");
  return { row, actor };
}

export const listPublishedPosts = createServerFn({ method: "GET" }).handler(
  async (): Promise<PostListItem[]> => {
    const chrome = await buildSiteChrome();
    return chrome.posts;
  },
);

async function queryPosts(sql: Awaited<ReturnType<typeof getSql>>, clause: string, params: unknown[] = []) {
  const rows = await sql.query<PostRow>(`${SELECT_LIST} ${clause}`, params);
  return attachTags(
    sql,
    rows.map((row) => toListItem(normalizeRow(row))),
  );
}

async function buildSiteChrome(): Promise<SiteChrome> {
  await ensureSeeded();
  const sql = await getSql();
  const posts = await queryPosts(
    sql,
    `where p.status = 'published' and p.deleted_at is null order by p.featured desc, p.published_at desc`,
  );
  const [tags, recentComments, pages] = await Promise.all([
    fetchTagCloud(sql),
    fetchRecentComments(sql),
    getFrontPages().catch(() => ({ ...DEFAULT_FRONT_PAGES })),
  ]);
  return { posts, tags, recentComments, pages };
}

export const getSiteChrome = createServerFn({ method: "GET" }).handler(async (): Promise<SiteChrome> => {
  return buildSiteChrome();
});

export const getWikiCatalog = createServerFn({ method: "GET" }).handler(async (): Promise<WikiCatalogItem[]> => {
  await ensureSeeded();
  const sql = await getSql();
  const { notes } = await loadWikiNotes(sql);
  return notes;
});

export const listPostsByTopic = createServerFn({ method: "GET" })
  .validator((topic: string) => topic)
  .handler(async ({ data: topic }): Promise<PostListItem[]> => {
    await ensureSeeded();
    const sql = await getSql();
    return queryPosts(sql, `where p.status = 'published' and p.deleted_at is null and p.topic = $1 order by p.published_at desc`, [topic]);
  });

export const listPostsByTag = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }): Promise<{ tag: { name: string; slug: string } | null; posts: PostListItem[] }> => {
    await ensureSeeded();
    const sql = await getSql();
    const tags = await sql.query<{ name: string; slug: string }>(`select name, slug from tags where slug = $1 limit 1`, [
      slug,
    ]);
    const tag = tags[0] ?? null;
    if (!tag) return { tag: null, posts: [] };
    const posts = await queryPosts(
      sql,
      `where p.status = 'published' and p.deleted_at is null and exists (
         select 1 from post_tags pt join tags t on t.id = pt.tag_id
         where pt.post_id = p.id and t.slug = $1
       ) order by p.published_at desc`,
      [slug],
    );
    return { tag, posts };
  });

export const searchPublishedPosts = createServerFn({ method: "GET" })
  .validator((query: string) => query.trim())
  .handler(async ({ data: query }): Promise<PostListItem[]> => {
    await ensureSeeded();
    const sql = await getSql();
    if (!query) {
      return queryPosts(sql, `where p.status = 'published' and p.deleted_at is null order by p.published_at desc`);
    }
    const like = `%${query}%`;
    return queryPosts(
      sql,
      `where p.status = 'published' and p.deleted_at is null and (p.title ilike $1 or p.excerpt ilike $1) order by p.published_at desc`,
      [like],
    );
  });

export const getPostBySlug = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((slug: string) => slug)
  .handler(async ({ context, data: slug }): Promise<PostDetail | null> => {
    await ensureSeeded();
    const sql = await getSql();
    const rows = await sql.query<PostRow>(`${SELECT_LIST} where p.slug = $1 and p.deleted_at is null limit 1`, [slug]);
    const row = rows[0];
    if (!row) return null;
    const [post] = await attachTags(sql, [toListItem(normalizeRow(row))]);
    const flags = await getViewerFlags(context.userId);
    const isOwner = Boolean(flags.userId && flags.userId === post.userId);
    const isStaff = flags.isStaff || isOwner;
    if (post.status !== "published" && !isStaff) return null;
    const access = buildAccessGate({
      mode: post.accessMode,
      exclusiveDays: post.exclusiveDays,
      publishedAt: post.publishedAt,
      isPaid: flags.isPaid,
      isStaff,
      signedIn: Boolean(flags.userId),
    });
    return { ...post, body: applyBodyGate(row.body, access), access, wiki: await loadWiki(sql, row) };
  });

export const listMyPosts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PostListItem[]> => {
    const sql = await getSql();
    const actor = await getActor(context.userId);
    if (actor.canEditAll) {
      return queryPosts(sql, `where p.deleted_at is null order by p.updated_at desc`);
    }
    return queryPosts(sql, `where p.user_id = $1 and p.deleted_at is null order by p.updated_at desc`, [context.userId]);
  });

const postInputSchema = z.object({
  title: z.string().trim().max(80),
  excerpt: z.string().trim().max(180),
  body: z.string().trim().max(20000),
  topic: z.string().trim().min(1),
  coverImage: z.string().trim().max(300).nullable().optional(),
  coverAlt: z.string().trim().max(120).nullable().optional(),
  status: z.enum(["draft", "published"]),
  tags: z.array(z.string().trim().min(1).max(12)).max(8).optional(),
  allowComments: z.boolean().optional(),
  accessMode: z.enum(["public", "early", "paid"]).optional(),
  exclusiveDays: z.number().int().min(1).max(365).optional(),
  recordRevision: z.boolean().optional(),
});

function assertPublishable(data: { status: string; title: string; excerpt: string; body: string }) {
  if (data.status !== "published") return;
  if (!data.title.trim()) throw new Error("标题不能为空");
  if (!data.excerpt.trim()) throw new Error("导语不能为空");
  if (data.body.trim().length < 20) throw new Error("正文太短");
}

export const createPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(postInputSchema)
  .handler(async ({ context, data }): Promise<{ slug: string; id: number }> => {
    if (!isTopic(data.topic)) throw new Error("未知栏目");
    assertPublishable(data);
    const actor = await getActor(context.userId);
    if (!actor.canWrite) throw new Error("没有权限");
    const sql = await getSql();
    const authorName = await displayNameFor(sql, context.userId, "作者");
    const title = data.title.trim() || "未命名";
    const slug = makeSlug(title);
    const minutes = readingMinutesFromBody(data.body);
    const publishedAt = data.status === "published" ? new Date().toISOString() : null;
    const cover = data.coverImage?.trim() || null;
    const coverAlt = data.coverAlt?.trim() || null;
    const allowComments = data.allowComments !== false;
    const accessMode: AccessMode = isAccessMode(data.accessMode) ? data.accessMode : "public";
    const exclusiveDays = clampExclusiveDays(data.exclusiveDays);
    const inserted = await sql`
      insert into posts (
        user_id, author_name, slug, title, excerpt, body,
        cover_image, cover_alt, topic, status, reading_minutes,
        featured, published_at, allow_comments, access_mode, exclusive_days
      ) values (
        ${context.userId}, ${authorName}, ${slug}, ${title}, ${data.excerpt},
        ${data.body}, ${cover}, ${coverAlt}, ${data.topic}, ${data.status},
        ${minutes}, ${false}, ${publishedAt}, ${allowComments}, ${accessMode}, ${exclusiveDays}
      )
      returning id
    `;
    const id = (inserted[0] as { id: number } | undefined)?.id;
    if (!id) throw new Error("无法保存");
    await replacePostTags(sql, id, data.tags ?? []);
    return { slug, id };
  });

const updateSchema = postInputSchema.extend({
  id: z.number().int().positive(),
});

export const updatePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(updateSchema)
  .handler(async ({ context, data }): Promise<{ slug: string }> => {
    if (!isTopic(data.topic)) throw new Error("未知栏目");
    const sql = await getSql();
    const { row: current } = await requirePostAccess(sql, context.userId, data.id);
    assertPublishable(data);
    const editorName = await displayNameFor(sql, context.userId, "作者");
    if (data.recordRevision !== false) {
      await sql`
        insert into post_revisions (post_id, title, excerpt, body, editor_id, editor_name)
        values (${current.id}, ${current.title}, ${current.excerpt}, ${current.body}, ${context.userId}, ${editorName})
      `;
      await sql`delete from post_revisions where post_id = ${current.id} and id not in (
        select id from (
          select id from post_revisions where post_id = ${current.id} order by created_at desc limit 20
        ) kept
      )`;
    }

    const minutes = readingMinutesFromBody(data.body);
    const title = data.title.trim() || "未命名";
    const publishedAt =
      data.status === "published" ? (current.published_at ?? new Date().toISOString()) : null;
    const cover = data.coverImage?.trim() || null;
    const coverAlt = data.coverAlt?.trim() || null;
    const allowComments = data.allowComments !== false;
    const accessMode: AccessMode = isAccessMode(data.accessMode) ? data.accessMode : "public";
    const exclusiveDays = clampExclusiveDays(data.exclusiveDays);
    const now = new Date().toISOString();
    await sql`
      update posts set
        title = ${title},
        excerpt = ${data.excerpt},
        body = ${data.body},
        topic = ${data.topic},
        cover_image = ${cover},
        cover_alt = ${coverAlt},
        status = ${data.status},
        reading_minutes = ${minutes},
        published_at = ${publishedAt},
        allow_comments = ${allowComments},
        access_mode = ${accessMode},
        exclusive_days = ${exclusiveDays},
        updated_at = ${now}
      where id = ${data.id}
    `;
    await replacePostTags(sql, data.id, data.tags ?? []);
    return { slug: current.slug };
  });

export const setPostStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.number().int().positive(),
      status: z.enum(["draft", "published"]),
    }),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const sql = await getSql();
    const { row } = await requirePostAccess(sql, context.userId, data.id);
    const publishedAt =
      data.status === "published" ? (row.published_at ?? new Date().toISOString()) : null;
    const now = new Date().toISOString();
    await sql`
      update posts set status = ${data.status}, published_at = ${publishedAt}, updated_at = ${now}
      where id = ${data.id}
    `;
    return { ok: true };
  });

export const setPostFeatured = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive(), featured: z.boolean() }))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const sql = await getSql();
    await requirePostAccess(sql, context.userId, data.id);
    await sql`
      update posts set featured = ${data.featured}, updated_at = ${new Date().toISOString()}
      where id = ${data.id}
    `;
    return { ok: true };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }): Promise<{ ok: true }> => {
    const sql = await getSql();
    await requirePostAccess(sql, context.userId, id);
    await sql`update posts set deleted_at = ${new Date().toISOString()} where id = ${id}`;
    return { ok: true };
  });

export const restorePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }): Promise<{ ok: true }> => {
    const sql = await getSql();
    await requirePostAccess(sql, context.userId, id, true);
    await sql`update posts set deleted_at = ${null} where id = ${id}`;
    return { ok: true };
  });

export const purgePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }): Promise<{ ok: true }> => {
    const sql = await getSql();
    const { actor } = await requirePostAccess(sql, context.userId, id, true);
    if (!actor.isAdmin && actor.userId === context.userId) {
      await sql`delete from posts where id = ${id} and user_id = ${context.userId}`;
    } else if (actor.isAdmin) {
      await sql`delete from posts where id = ${id}`;
    } else {
      throw new Error("没有权限");
    }
    return { ok: true };
  });

export const getPostForEdit = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }): Promise<PostDetail | null> => {
    const sql = await getSql();
    try {
      await requirePostAccess(sql, context.userId, id);
    } catch {
      return null;
    }
    const rows = await sql.query<PostRow>(`${SELECT_LIST} where p.id = $1 limit 1`, [id]);
    const row = rows[0];
    if (!row) return null;
    const [post] = await attachTags(sql, [toListItem(normalizeRow(row))]);
    const access = buildAccessGate({
      mode: post.accessMode,
      exclusiveDays: post.exclusiveDays,
      publishedAt: post.publishedAt,
      isPaid: true,
      isStaff: true,
      signedIn: true,
    });
    return { ...post, body: row.body, access, wiki: await loadWiki(sql, row) };
  });

export const listRevisions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((postId: number) => postId)
  .handler(async ({ context, data: postId }): Promise<PostRevision[]> => {
    const sql = await getSql();
    await requirePostAccess(sql, context.userId, postId);
    const rows = await sql.query<{
      id: number;
      post_id: number;
      title: string;
      excerpt: string;
      body: string;
      editor_name: string;
      created_at: string;
    }>(
      `select id, post_id, title, excerpt, body, editor_name, created_at
       from post_revisions where post_id = $1 order by created_at desc limit 20`,
      [postId],
    );
    return rows.map((row) => ({
      id: row.id,
      postId: row.post_id,
      title: row.title,
      excerpt: row.excerpt,
      body: row.body,
      editorName: row.editor_name,
      createdAt: typeof row.created_at === "string" ? row.created_at : new Date(row.created_at).toISOString(),
    }));
  });

export const restoreRevision = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ postId: z.number().int().positive(), revisionId: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const sql = await getSql();
    const { row } = await requirePostAccess(sql, context.userId, data.postId);
    const rev = await sql.query<{ title: string; excerpt: string; body: string }>(
      `select title, excerpt, body from post_revisions where id = $1 and post_id = $2`,
      [data.revisionId, data.postId],
    );
    if (!rev[0]) throw new Error("找不到这个版本");
    const editorName = await displayNameFor(sql, context.userId, "作者");
    await sql`
      insert into post_revisions (post_id, title, excerpt, body, editor_id, editor_name)
      values (${row.id}, ${row.title}, ${row.excerpt}, ${row.body}, ${context.userId}, ${editorName})
    `;
    const minutes = readingMinutesFromBody(rev[0].body);
    await sql`
      update posts set title = ${rev[0].title}, excerpt = ${rev[0].excerpt}, body = ${rev[0].body},
        reading_minutes = ${minutes}, updated_at = ${new Date().toISOString()}
      where id = ${data.postId}
    `;
    return { ok: true };
  });

export type UpsertPostInput = {
  userId: string;
  slug?: string;
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

export async function upsertPostBySlug(input: UpsertPostInput): Promise<{ id: number; slug: string; created: boolean }> {
  if (!isTopic(input.topic)) throw new Error("未知栏目");
  const title = input.title.trim();
  const excerpt = input.excerpt.trim();
  const body = input.body.trim();
  if (!title) throw new Error("缺少标题");
  if (body.length < 8) throw new Error("正文太短");
  const sql = await getSql();
  const actor = await getActor(input.userId);
  if (!actor.canWrite) throw new Error("没有权限");
  const authorName = await displayNameFor(sql, input.userId, "作者");
  let slug = makeStableSlug(title, input.slug);
  const found = await sql.query<{ id: number; user_id: string; deleted_at: string | null; published_at: string | null }>(
    `select id, user_id, deleted_at, published_at from posts where slug = $1 limit 1`,
    [slug],
  );
  const minutes = readingMinutesFromBody(body);
  const cover = input.coverImage?.trim() || null;
  const coverAlt = input.coverAlt?.trim() || title;
  const allowComments = input.allowComments !== false;
  const accessMode = isAccessMode(input.accessMode) ? input.accessMode : null;
  const exclusiveDays = input.exclusiveDays != null ? clampExclusiveDays(input.exclusiveDays) : null;
  const now = new Date().toISOString();

  if (found[0]) {
    if (found[0].user_id !== input.userId && !actor.canEditAll) throw new Error("这个别名已被占用");
    const id = found[0].id;
    const current = await sql.query<{ title: string; excerpt: string; body: string }>(
      `select title, excerpt, body from posts where id = $1`,
      [id],
    );
    if (current[0]) {
      await sql`
        insert into post_revisions (post_id, title, excerpt, body, editor_id, editor_name)
        values (${id}, ${current[0].title}, ${current[0].excerpt}, ${current[0].body}, ${input.userId}, ${authorName})
      `;
    }
    const publishedAt =
      input.status === "published" ? (found[0].published_at ?? now) : null;
    await sql`
      update posts set
        title = ${title},
        excerpt = ${excerpt},
        body = ${body},
        topic = ${input.topic},
        cover_image = ${cover},
        cover_alt = ${coverAlt},
        status = ${input.status},
        reading_minutes = ${minutes},
        published_at = ${publishedAt},
        allow_comments = ${allowComments},
        access_mode = coalesce(${accessMode}, access_mode),
        exclusive_days = coalesce(${exclusiveDays}, exclusive_days),
        deleted_at = ${null},
        updated_at = ${now}
      where id = ${id}
    `;
    await replacePostTags(sql, id, input.tags ?? []);
    return { id, slug, created: false };
  }

  const clash = await sql.query<{ id: number }>(`select id from posts where slug = $1`, [slug]);
  if (clash[0]) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const publishedAt = input.status === "published" ? now : null;
  const inserted = await sql`
    insert into posts (
      user_id, author_name, slug, title, excerpt, body,
      cover_image, cover_alt, topic, status, reading_minutes,
      featured, published_at, allow_comments, access_mode, exclusive_days
    ) values (
      ${input.userId}, ${authorName}, ${slug}, ${title}, ${excerpt}, ${body},
      ${cover}, ${coverAlt}, ${input.topic}, ${input.status}, ${minutes},
      ${false}, ${publishedAt}, ${allowComments}, ${accessMode ?? "public"}, ${exclusiveDays ?? 7}
    )
    returning id
  `;
  const id = (inserted[0] as { id: number } | undefined)?.id;
  if (!id) throw new Error("无法保存");
  await replacePostTags(sql, id, input.tags ?? []);
  return { id, slug, created: true };
}

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ userId: z.string().min(1), role: z.enum(ROLES) }))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) throw new Error("没有权限");
    const sql = await getSql();
    if (data.role !== "admin") {
      const admins = await sql.query<{ n: number }>(
        `select count(*)::int as n from user_roles where role = 'admin'`,
      );
      const current = await sql.query<{ role: string }>(`select role from user_roles where user_id = $1`, [
        data.userId,
      ]);
      if ((admins[0]?.n ?? 0) <= 1 && current[0]?.role === "admin") {
        throw new Error("至少保留一位管理员");
      }
    }
    await sql`insert into user_roles (user_id, role) values (${data.userId}, ${data.role})
      on conflict (user_id) do update set role = ${data.role}`;
    return { ok: true };
  });

export const getAuthorDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ scope: z.enum(["self", "all"]).optional() }).optional())
  .handler(async ({ context, data }): Promise<AuthorDashboard> => {
    const sql = await getSql();
    const actor = await getActor(context.userId);
    const authored = data?.scope === "self";
    const self = authored || !actor.canEditAll;
    const liveClause = self
      ? `where p.user_id = $1 and p.deleted_at is null order by p.updated_at desc`
      : `where p.deleted_at is null order by p.updated_at desc`;
    const trashClause = self
      ? `where p.user_id = $1 and p.deleted_at is not null order by p.deleted_at desc`
      : `where p.deleted_at is not null order by p.deleted_at desc`;
    const params = self ? [context.userId] : [];
    const posts = await queryPosts(sql, liveClause, params);
    const trash = await queryPosts(sql, trashClause, params);
    const commentSql = authored
      ? `select c.id, c.post_id, c.user_id, c.author_name, c.body, c.parent_id, c.created_at, p.title, p.slug
         from comments c join posts p on p.id = c.post_id
         where c.user_id = $1 and p.deleted_at is null order by c.created_at desc limit 30`
      : self
        ? `select c.id, c.post_id, c.user_id, c.author_name, c.body, c.parent_id, c.created_at, p.title, p.slug
         from comments c join posts p on p.id = c.post_id
         where p.user_id = $1 and p.deleted_at is null order by c.created_at desc limit 30`
        : `select c.id, c.post_id, c.user_id, c.author_name, c.body, c.parent_id, c.created_at, p.title, p.slug
         from comments c join posts p on p.id = c.post_id
         where p.deleted_at is null order by c.created_at desc limit 30`;
    const commentRows = await sql.query<{
      id: number;
      post_id: number;
      user_id: string;
      author_name: string;
      body: string;
      parent_id: number | null;
      created_at: string;
      title: string;
      slug: string;
    }>(commentSql, params);
    const comments: InboxComment[] = commentRows.map((row) => ({
      id: row.id,
      postId: row.post_id,
      userId: row.user_id,
      authorName: row.author_name,
      body: row.body,
      parentId: row.parent_id ?? null,
      createdAt: typeof row.created_at === "string" ? row.created_at : new Date(row.created_at).toISOString(),
      postTitle: row.title,
      postSlug: row.slug,
    }));
    const likeSql = authored
      ? `select count(*)::int as n from post_likes where user_id = $1`
      : self
        ? `select count(*)::int as n from post_likes l join posts p on p.id = l.post_id where p.user_id = $1`
        : `select count(*)::int as n from post_likes l join posts p on p.id = l.post_id where p.deleted_at is null`;
    const commentCountSql = authored
      ? `select count(*)::int as n from comments where user_id = $1`
      : self
        ? `select count(*)::int as n from comments c join posts p on p.id = c.post_id where p.user_id = $1`
        : `select count(*)::int as n from comments c join posts p on p.id = c.post_id where p.deleted_at is null`;
    const likeRows = await sql.query<{ n: number }>(likeSql, params);
    const commentCountRows = await sql.query<{ n: number }>(commentCountSql, params);
    let members: AuthorDashboard["members"] = [];
    if (actor.isAdmin && !self) {
      const userRows = await sql.query<{ id: string; name: string | null; email: string | null; role: string | null }>(
        `select u.id, u.name, u.email, r.role
         from "user" u
         left join user_roles r on r.user_id = u.id
         order by u."createdAt" desc`,
      );
      members = userRows.map((row) => ({
        id: row.id,
        name: row.name?.trim() || row.email?.split("@")[0] || "用户",
        email: row.email,
        role: parseRole(row.role),
      }));
    }
    return {
      role: actor.role,
      postCount: posts.length,
      draftCount: posts.filter((post) => post.status === "draft").length,
      publishedCount: posts.filter((post) => post.status === "published").length,
      commentCount: Number(commentCountRows[0]?.n ?? comments.length),
      likeCount: Number(likeRows[0]?.n ?? 0),
      posts,
      comments,
      trash,
      members,
    };
  });
