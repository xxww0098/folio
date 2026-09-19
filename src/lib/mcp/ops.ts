import { saveAttachmentBytes } from "@/lib/attachments/server";
import { upsertPostBySlug } from "@/lib/blog/server";
import { TOPICS, type Topic } from "@/lib/blog/types";
import { getSql } from "@/lib/db";
import { clampExclusiveDays, isAccessMode, type AccessMode } from "@/lib/membership/access";
import { displayNameFor } from "@/lib/profile";
import { getActor } from "@/lib/roles";
import { listSyncPosts, publishMarkdown, pullMarkdown } from "@/lib/obsidian/sync";
import { asBoolean, asNumber, asString, asStringArray, jsonResult, type CallToolResult } from "./protocol";

type PostRow = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  topic: string;
  status: "draft" | "published";
  cover_image: string | null;
  access_mode: string | null;
  exclusive_days: number | null;
  user_id: string;
  deleted_at: string | null;
  published_at: string | null;
};

async function loadBySlug(userId: string, slug: string, includeDeleted = false) {
  const actor = await getActor(userId);
  const sql = await getSql();
  const rows = await sql.query<PostRow>(
    `select id, slug, title, excerpt, body, topic, status, cover_image, access_mode, exclusive_days,
            user_id, deleted_at, published_at
     from posts where slug = $1 ${includeDeleted ? "" : "and deleted_at is null"} limit 1`,
    [slug],
  );
  const row = rows[0];
  if (!row) throw new Error("找不到这篇文章");
  if (row.user_id !== userId && !actor.canEditAll) throw new Error("没有权限");
  return { row, actor, sql };
}

async function loadById(userId: string, id: number) {
  const actor = await getActor(userId);
  const sql = await getSql();
  const rows = await sql.query<PostRow>(
    `select id, slug, title, excerpt, body, topic, status, cover_image, access_mode, exclusive_days,
            user_id, deleted_at, published_at
     from posts where id = $1 and deleted_at is null limit 1`,
    [id],
  );
  const row = rows[0];
  if (!row) throw new Error("找不到这篇文章");
  if (row.user_id !== userId && !actor.canEditAll) throw new Error("没有权限");
  return { row, actor };
}

function clampLimit(value: unknown, fallback: number, max: number) {
  const n = asNumber(value);
  if (n == null) return fallback;
  return Math.max(1, Math.min(max, Math.round(n)));
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
  ctx: { userId: string; origin: string },
): Promise<CallToolResult> {
  const writeTools = new Set([
    "draft_post",
    "publish_post",
    "update_post",
    "set_post_status",
    "delete_post",
    "restore_post",
    "upload_image",
  ]);
  if (writeTools.has(name)) {
    const actor = await getActor(ctx.userId);
    if (!actor.canWrite) return jsonResult({ error: "没有权限" }, true);
  }
  switch (name) {
    case "whoami":
      return whoami(ctx.userId);
    case "list_posts":
      return listPosts(ctx.userId, args);
    case "get_post":
      return getPost(ctx.userId, ctx.origin, args);
    case "search_posts":
      return searchPosts(ctx.userId, args);
    case "draft_post":
      return savePost(ctx.userId, ctx.origin, args, "draft");
    case "publish_post":
      return savePost(ctx.userId, ctx.origin, args, "published");
    case "update_post":
      return update(ctx.userId, ctx.origin, args);
    case "set_post_status":
      return setStatus(ctx.userId, ctx.origin, args);
    case "delete_post":
      return remove(ctx.userId, args);
    case "restore_post":
      return restore(ctx.userId, ctx.origin, args);
    case "list_topics":
      return jsonResult({ topics: [...TOPICS] });
    case "list_revisions":
      return revisions(ctx.userId, args);
    case "upload_image":
      return upload(ctx.userId, ctx.origin, args);
    default:
      return jsonResult({ error: `未知工具：${name}` }, true);
  }
}

async function whoami(userId: string) {
  const actor = await getActor(userId);
  const sql = await getSql();
  const name = await displayNameFor(sql, userId, "作者");
  return jsonResult({
    userId,
    name,
    role: actor.role,
    canWrite: actor.canWrite,
    canEditAll: actor.canEditAll,
    topics: [...TOPICS],
  });
}

async function listPosts(userId: string, args: Record<string, unknown>) {
  const actor = await getActor(userId);
  const includeTrash = asBoolean(args.includeTrash) === true;
  const limit = clampLimit(args.limit, 40, 100);
  const status = asString(args.status);
  const topic = asString(args.topic);
  const q = asString(args.q)?.trim().toLowerCase();

  if (includeTrash) {
    const sql = await getSql();
    const rows = actor.canEditAll
      ? await sql.query<{ id: number; slug: string; title: string; topic: string; status: string; updated_at: string; deleted_at: string }>(
          `select id, slug, title, topic, status, updated_at, deleted_at from posts
           where deleted_at is not null order by deleted_at desc limit $1`,
          [limit],
        )
      : await sql.query<{ id: number; slug: string; title: string; topic: string; status: string; updated_at: string; deleted_at: string }>(
          `select id, slug, title, topic, status, updated_at, deleted_at from posts
           where user_id = $1 and deleted_at is not null order by deleted_at desc limit $2`,
          [userId, limit],
        );
    return jsonResult({
      posts: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        topic: row.topic,
        status: row.status,
        trashed: true,
        updatedAt: String(row.updated_at),
      })),
    });
  }

  let posts = await listSyncPosts(userId, actor.canEditAll);
  if (status === "draft" || status === "published") posts = posts.filter((post) => post.status === status);
  if (topic) posts = posts.filter((post) => post.topic === topic);
  if (q) {
    posts = posts.filter(
      (post) =>
        post.title.toLowerCase().includes(q) ||
        post.slug.toLowerCase().includes(q) ||
        post.topic.toLowerCase().includes(q),
    );
  }
  return jsonResult({ posts: posts.slice(0, limit) });
}

async function getPost(userId: string, origin: string, args: Record<string, unknown>) {
  const actor = await getActor(userId);
  let slug = asString(args.slug)?.trim();
  const id = asNumber(args.id);
  if (!slug && id != null) {
    const found = await loadById(userId, id);
    slug = found.row.slug;
  }
  if (!slug) throw new Error("请提供 slug 或 id");
  const markdown = await pullMarkdown(userId, slug, origin, actor.canEditAll);
  if (!markdown) throw new Error("找不到这篇文章");
  return jsonResult({ slug, url: `${origin}/posts/${slug}`, markdown });
}

async function searchPosts(userId: string, args: Record<string, unknown>) {
  const q = asString(args.q)?.trim();
  if (!q) throw new Error("请提供 q");
  const actor = await getActor(userId);
  const sql = await getSql();
  const needle = `%${q.replace(/[%_\\]/g, "").slice(0, 80)}%`;
  const limit = clampLimit(args.limit, 20, 50);
  const rows = actor.canEditAll
    ? await sql.query<{ id: number; slug: string; title: string; topic: string; status: string; excerpt: string }>(
        `select id, slug, title, topic, status, excerpt from posts
         where deleted_at is null
           and (title ilike $1 or excerpt ilike $1 or slug ilike $1)
         order by updated_at desc limit $2`,
        [needle, limit],
      )
    : await sql.query<{ id: number; slug: string; title: string; topic: string; status: string; excerpt: string }>(
        `select id, slug, title, topic, status, excerpt from posts
         where user_id = $1 and deleted_at is null
           and (title ilike $2 or excerpt ilike $2 or slug ilike $2)
         order by updated_at desc limit $3`,
        [userId, needle, limit],
      );
  return jsonResult({
    q,
    posts: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      topic: row.topic,
      status: row.status,
      excerpt: row.excerpt,
    })),
  });
}

async function savePost(
  userId: string,
  origin: string,
  args: Record<string, unknown>,
  status: "draft" | "published",
) {
  const markdown = asString(args.markdown) ?? "";
  if (markdown.trim().length < 8) throw new Error("正文太短");
  if (markdown.length > 80000) throw new Error("正文过长");
  const result = await publishMarkdown(userId, markdown, origin, { status });
  return jsonResult({
    id: result.id,
    slug: result.slug,
    created: result.created,
    status: result.status,
    url: result.url,
    editUrl: `${origin}/console?section=write&id=${result.id}`,
    markdown: result.markdown,
  });
}

async function update(userId: string, origin: string, args: Record<string, unknown>) {
  const slug = asString(args.slug)?.trim();
  if (!slug) throw new Error("请提供 slug");
  const { row, sql } = await loadBySlug(userId, slug);
  const title = asString(args.title)?.trim() || row.title;
  const excerpt = asString(args.excerpt)?.trim() || row.excerpt;
  const body = asString(args.body) ?? row.body;
  const topic = (asString(args.topic)?.trim() || row.topic) as Topic;
  const statusRaw = asString(args.status);
  const status = statusRaw === "draft" || statusRaw === "published" ? statusRaw : row.status;
  const accessRaw = asString(args.access);
  const accessMode: AccessMode | undefined = isAccessMode(accessRaw) ? accessRaw : undefined;
  const exclusiveDays = asNumber(args.exclusiveDays);
  let tags = asStringArray(args.tags);
  if (!tags) {
    const currentTags = await sql.query<{ name: string }>(
      `select t.name from tags t join post_tags pt on pt.tag_id = t.id where pt.post_id = $1`,
      [row.id],
    );
    tags = currentTags.map((item) => item.name);
  }
  const cover = asString(args.cover);
  const result = await upsertPostBySlug({
    userId,
    slug: row.slug,
    title,
    excerpt,
    body,
    topic,
    coverImage: cover === undefined ? row.cover_image : cover,
    coverAlt: title,
    status,
    tags,
    accessMode,
    exclusiveDays: exclusiveDays != null ? clampExclusiveDays(exclusiveDays) : undefined,
  });
  const actor = await getActor(userId);
  const markdown = await pullMarkdown(userId, result.slug, origin, actor.canEditAll);
  return jsonResult({
    id: result.id,
    slug: result.slug,
    status,
    url: `${origin}/posts/${result.slug}`,
    editUrl: `${origin}/console?section=write&id=${result.id}`,
    markdown,
  });
}

async function setStatus(userId: string, origin: string, args: Record<string, unknown>) {
  const slug = asString(args.slug)?.trim();
  const status = asString(args.status);
  if (!slug) throw new Error("请提供 slug");
  if (status !== "draft" && status !== "published") throw new Error("status 只能是 draft 或 published");
  return update(userId, origin, { slug, status });
}

async function remove(userId: string, args: Record<string, unknown>) {
  const slug = asString(args.slug)?.trim();
  if (!slug) throw new Error("请提供 slug");
  const { row, sql } = await loadBySlug(userId, slug);
  await sql`update posts set deleted_at = ${new Date().toISOString()} where id = ${row.id}`;
  return jsonResult({ ok: true, slug: row.slug, trashed: true });
}

async function restore(userId: string, origin: string, args: Record<string, unknown>) {
  const slug = asString(args.slug)?.trim();
  if (!slug) throw new Error("请提供 slug");
  const { row, sql, actor } = await loadBySlug(userId, slug, true);
  if (!row.deleted_at) throw new Error("这篇文章不在回收站");
  await sql`update posts set deleted_at = ${null} where id = ${row.id}`;
  const markdown = await pullMarkdown(userId, row.slug, origin, actor.canEditAll);
  return jsonResult({ ok: true, slug: row.slug, url: `${origin}/posts/${row.slug}`, markdown });
}

async function revisions(userId: string, args: Record<string, unknown>) {
  const slug = asString(args.slug)?.trim();
  if (!slug) throw new Error("请提供 slug");
  const { row, sql } = await loadBySlug(userId, slug);
  const rows = await sql.query<{
    id: number;
    title: string;
    excerpt: string;
    editor_name: string;
    created_at: string;
  }>(
    `select id, title, excerpt, editor_name, created_at
     from post_revisions where post_id = $1 order by created_at desc limit 20`,
    [row.id],
  );
  return jsonResult({
    slug: row.slug,
    revisions: rows.map((item) => ({
      id: item.id,
      title: item.title,
      excerpt: item.excerpt,
      editorName: item.editor_name,
      createdAt: String(item.created_at),
    })),
  });
}

async function upload(userId: string, origin: string, args: Record<string, unknown>) {
  const filename = asString(args.filename)?.trim();
  const dataBase64 = asString(args.dataBase64) ?? "";
  const mimeType = asString(args.mimeType) ?? "image/jpeg";
  const alt = asString(args.alt);
  if (!filename) throw new Error("请提供 filename");
  if (dataBase64.length < 24) throw new Error("图片内容太短");
  const trimmed = dataBase64.trim();
  const match = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
  const bytes = Buffer.from(match ? match[2] : trimmed.includes(",") ? trimmed.slice(trimmed.indexOf(",") + 1) : trimmed, "base64");
  const mime = match?.[1] || mimeType;
  const item = await saveAttachmentBytes({
    userId,
    filename,
    mimeType: mime,
    bytes,
    alt: alt ?? filename.replace(/\.[^.]+$/, ""),
    groupName: "Agent",
  });
  return jsonResult({
    id: item.id,
    filename: item.filename,
    url: item.url,
    permalink: `${origin}${item.url}`,
    markdown: `![${item.alt || item.filename}](${origin}${item.url})`,
  });
}

export async function listPostResources(userId: string, origin: string) {
  const actor = await getActor(userId);
  const posts = await listSyncPosts(userId, actor.canEditAll);
  return [
    { uri: "folio://site", name: "站点", mimeType: "application/json", description: "站点栏目与当前用户" },
    { uri: "folio://posts", name: "文章列表", mimeType: "application/json", description: "可管理的文章" },
    ...posts.slice(0, 50).map((post) => ({
      uri: `folio://posts/${post.slug}`,
      name: post.title,
      mimeType: "text/markdown",
      description: `${post.topic} · ${post.status} · ${origin}/posts/${post.slug}`,
    })),
  ];
}

export async function readResource(uri: string, ctx: { userId: string; origin: string }) {
  if (uri === "folio://site") {
    const result = await whoami(ctx.userId);
    return { mimeType: "application/json", text: result.content[0]?.text ?? "{}" };
  }
  if (uri === "folio://posts") {
    const result = await listPosts(ctx.userId, { limit: 40 });
    return { mimeType: "application/json", text: result.content[0]?.text ?? "{}" };
  }
  const match = /^folio:\/\/posts\/(.+)$/.exec(uri);
  if (match) {
    const slug = decodeURIComponent(match[1]);
    const result = await getPost(ctx.userId, ctx.origin, { slug });
    const data = JSON.parse(result.content[0]?.text ?? "{}") as { markdown?: string };
    return { mimeType: "text/markdown", text: data.markdown ?? "" };
  }
  throw new Error("未知资源");
}
