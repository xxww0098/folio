import { saveAttachmentBytes, attachmentPermalink } from "@/lib/attachments/server";
import { upsertPostBySlug } from "@/lib/blog/server";
import { getSql } from "@/lib/db";
import { clampExclusiveDays, isAccessMode, type AccessMode } from "@/lib/membership/access";
import { displayNameFor } from "@/lib/profile";
import { getActor } from "@/lib/roles";
import { listSyncPosts, publishMarkdown, pullMarkdown } from "@/lib/obsidian/sync";
import { CURRENT_VERSION } from "@/lib/release";
import { loadTopics } from "@/lib/topics/server";
import { MAX_TOPICS, normalizeTopicName } from "@/lib/topics/catalog";
import { DEFAULT_FRONT_PAGES, isFrontPage, parseFrontPages } from "@/lib/pages/visibility";
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
    "add_comment",
    "delete_comment",
    "create_moment",
    "delete_moment",
    "create_link",
    "delete_link",
    "create_photo",
    "set_front_page",
    "add_topic",
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
      return jsonResult({ topics: await loadTopics() });
    case "list_revisions":
      return revisions(ctx.userId, args);
    case "upload_image":
      return upload(ctx.userId, ctx.origin, args);
    case "site_overview":
      return siteOverview();
    case "list_comments":
      return listCommentsTool(args);
    case "add_comment":
      return addCommentTool(ctx.userId, args);
    case "delete_comment":
      return deleteCommentTool(ctx.userId, args);
    case "list_moments":
      return listMomentsTool(args);
    case "create_moment":
      return createMomentTool(ctx.userId, args);
    case "delete_moment":
      return deleteMomentTool(ctx.userId, args);
    case "list_links":
      return listLinksTool();
    case "create_link":
      return createLinkTool(ctx.userId, args);
    case "delete_link":
      return deleteLinkTool(ctx.userId, args);
    case "list_photos":
      return listPhotosTool();
    case "create_photo":
      return createPhotoTool(ctx.userId, args);
    case "list_pages":
      return listPagesTool();
    case "set_front_page":
      return setFrontPageTool(ctx.userId, args);
    case "add_topic":
      return addTopicTool(ctx.userId, args);
    case "get_revision":
      return getRevisionTool(ctx.userId, args);
    default:
      return jsonResult({ error: `未知工具：${name}` }, true);
  }
}

async function whoami(userId: string) {
  const actor = await getActor(userId);
  const sql = await getSql();
  const name = await displayNameFor(sql, userId, "站长");
  return jsonResult({
    userId,
    name,
    role: actor.role,
    canWrite: actor.canWrite,
    canEditAll: actor.canEditAll,
    topics: await loadTopics(),
    pages: await readPages(),
    version: CURRENT_VERSION.replace(/^v/, ""),
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
  const topic = asString(args.topic)?.trim() || row.topic;
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
  const permalink = attachmentPermalink(item.url, origin);
  return jsonResult({
    id: item.id,
    filename: item.filename,
    url: permalink,
    permalink,
    markdown: `![${item.alt || item.filename}](${permalink})`,
  });
}

async function requireAdmin(userId: string) {
  const actor = await getActor(userId);
  if (!actor.isAdmin) throw new Error("只有管理员可以执行");
  return actor;
}

async function readPages() {
  try {
    const sql = await getSql();
    const rows = await sql.query<{ value: string }>(`select value from site_settings where key = $1 limit 1`, ["front_pages"]);
    return parseFrontPages(rows[0]?.value);
  } catch {
    return { ...DEFAULT_FRONT_PAGES };
  }
}

async function siteOverview() {
  const sql = await getSql();
  const posts = await sql.query<{ published: number; draft: number; trash: number }>(
    `select
       count(*) filter (where deleted_at is null and status = 'published')::int as published,
       count(*) filter (where deleted_at is null and status = 'draft')::int as draft,
       count(*) filter (where deleted_at is not null)::int as trash
     from posts`,
  );
  const extras = await sql.query<{ comments: number; members: number; moments: number }>(
    `select
       (select count(*)::int from comments) as comments,
       (select count(*)::int from user_roles) as members,
       (select count(*)::int from moments) as moments`,
  );
  return jsonResult({
    version: CURRENT_VERSION.replace(/^v/, ""),
    posts: posts[0] ?? { published: 0, draft: 0, trash: 0 },
    comments: extras[0]?.comments ?? 0,
    members: extras[0]?.members ?? 0,
    moments: extras[0]?.moments ?? 0,
    topics: await loadTopics(),
    pages: await readPages(),
  });
}

async function listCommentsTool(args: Record<string, unknown>) {
  const sql = await getSql();
  const limit = clampLimit(args.limit, 30, 80);
  const slug = asString(args.slug)?.trim();
  const rows = slug
    ? await sql.query<{
        id: number;
        post_id: number;
        slug: string;
        title: string;
        author_name: string;
        body: string;
        parent_id: number | null;
        created_at: string;
      }>(
        `select c.id, c.post_id, p.slug, p.title, c.author_name, c.body, c.parent_id, c.created_at
         from comments c join posts p on p.id = c.post_id
         where p.slug = $1
         order by c.created_at desc limit $2`,
        [slug, limit],
      )
    : await sql.query<{
        id: number;
        post_id: number;
        slug: string;
        title: string;
        author_name: string;
        body: string;
        parent_id: number | null;
        created_at: string;
      }>(
        `select c.id, c.post_id, p.slug, p.title, c.author_name, c.body, c.parent_id, c.created_at
         from comments c join posts p on p.id = c.post_id
         order by c.created_at desc limit $1`,
        [limit],
      );
  return jsonResult({
    comments: rows.map((row) => ({
      id: row.id,
      postId: row.post_id,
      slug: row.slug,
      postTitle: row.title,
      authorName: row.author_name,
      body: row.body,
      parentId: row.parent_id,
      createdAt: String(row.created_at),
    })),
  });
}

async function addCommentTool(userId: string, args: Record<string, unknown>) {
  const body = asString(args.body)?.trim() ?? "";
  if (body.length < 2 || body.length > 1000) throw new Error("评论需 2–1000 字");
  const sql = await getSql();
  let postId = asNumber(args.postId);
  const slug = asString(args.slug)?.trim();
  if (!postId && slug) {
    const found = await sql.query<{ id: number }>(
      `select id from posts where slug = $1 and status = 'published' and deleted_at is null limit 1`,
      [slug],
    );
    postId = found[0]?.id;
  }
  if (!postId) throw new Error("请提供 slug 或 postId");
  const published = await sql.query<{ id: number; allow_comments: boolean }>(
    `select id, allow_comments from posts where id = $1 and status = 'published' and deleted_at is null`,
    [postId],
  );
  if (!published[0]) throw new Error("文章不存在或尚未刊出");
  if (published[0].allow_comments === false) throw new Error("本文已关闭评论");
  let parentId = asNumber(args.parentId) ?? null;
  if (parentId) {
    const parent = await sql.query<{ id: number; parent_id: number | null }>(
      `select id, parent_id from comments where id = $1 and post_id = $2`,
      [parentId, postId],
    );
    if (!parent[0]) throw new Error("回复的评论不存在");
    if (parent[0].parent_id) parentId = parent[0].parent_id;
  }
  const authorName = await displayNameFor(sql, userId, "读者");
  const rows = await sql`
    insert into comments (post_id, user_id, author_name, body, parent_id)
    values (${postId}, ${userId}, ${authorName}, ${body}, ${parentId})
    returning id, post_id, created_at
  `;
  return jsonResult({
    id: rows[0]?.id,
    postId,
    parentId,
    createdAt: String(rows[0]?.created_at ?? ""),
  });
}

async function deleteCommentTool(userId: string, args: Record<string, unknown>) {
  const id = asNumber(args.id);
  if (!id) throw new Error("请提供 id");
  const sql = await getSql();
  const actor = await getActor(userId);
  if (actor.canEditAll) {
    await sql`delete from comments where id = ${id}`;
  } else {
    await sql`
      delete from comments
      where id = ${id}
        and (user_id = ${userId} or post_id in (select id from posts where user_id = ${userId}))
    `;
  }
  return jsonResult({ ok: true, id });
}

async function listMomentsTool(args: Record<string, unknown>) {
  const sql = await getSql();
  const limit = clampLimit(args.limit, 20, 40);
  const rows = await sql.query<{ id: number; author_name: string; body: string; created_at: string }>(
    `select id, author_name, body, created_at from moments order by created_at desc limit $1`,
    [limit],
  );
  return jsonResult({
    moments: rows.map((row) => ({
      id: row.id,
      authorName: row.author_name,
      body: row.body,
      createdAt: String(row.created_at),
    })),
  });
}

async function createMomentTool(userId: string, args: Record<string, unknown>) {
  const body = asString(args.body)?.trim() ?? "";
  if (body.length < 2 || body.length > 280) throw new Error("瞬间需 2–280 字");
  const sql = await getSql();
  const authorName = await displayNameFor(sql, userId, "站长");
  const rows = await sql`
    insert into moments (user_id, author_name, body)
    values (${userId}, ${authorName}, ${body})
    returning id, created_at
  `;
  return jsonResult({ id: rows[0]?.id, createdAt: String(rows[0]?.created_at ?? "") });
}

async function deleteMomentTool(userId: string, args: Record<string, unknown>) {
  await requireAdmin(userId);
  const id = asNumber(args.id);
  if (!id) throw new Error("请提供 id");
  const sql = await getSql();
  await sql`delete from moments where id = ${id}`;
  return jsonResult({ ok: true, id });
}

async function listLinksTool() {
  const sql = await getSql();
  const rows = await sql.query<{ id: number; name: string; url: string; description: string; group_name: string }>(
    `select id, name, url, description, group_name from friend_links order by sort_order asc, id asc`,
  );
  return jsonResult({
    links: rows.map((row) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      description: row.description,
      groupName: row.group_name,
    })),
  });
}

async function createLinkTool(userId: string, args: Record<string, unknown>) {
  await requireAdmin(userId);
  const name = asString(args.name)?.trim() ?? "";
  const url = asString(args.url)?.trim() ?? "";
  if (!name || !url) throw new Error("请提供 name 和 url");
  if (!/^https?:\/\//i.test(url)) throw new Error("url 需以 http 开头");
  const sql = await getSql();
  const rows = await sql`
    insert into friend_links (name, url, description, group_name)
    values (${name}, ${url}, ${asString(args.description)?.trim() ?? ""}, ${asString(args.groupName)?.trim() || "阅读"})
    returning id
  `;
  return jsonResult({ id: rows[0]?.id, name, url });
}

async function deleteLinkTool(userId: string, args: Record<string, unknown>) {
  await requireAdmin(userId);
  const id = asNumber(args.id);
  if (!id) throw new Error("请提供 id");
  const sql = await getSql();
  await sql`delete from friend_links where id = ${id}`;
  return jsonResult({ ok: true, id });
}

async function listPhotosTool() {
  const sql = await getSql();
  const rows = await sql.query<{ id: number; title: string; image: string; group_name: string; taken_at: string }>(
    `select id, title, image, group_name, taken_at from photos order by taken_at desc`,
  );
  return jsonResult({
    photos: rows.map((row) => ({
      id: row.id,
      title: row.title,
      image: row.image,
      groupName: row.group_name,
      takenAt: String(row.taken_at),
    })),
  });
}

async function createPhotoTool(userId: string, args: Record<string, unknown>) {
  await requireAdmin(userId);
  const title = asString(args.title)?.trim() ?? "";
  const image = asString(args.image)?.trim() ?? "";
  if (!title || !image) throw new Error("请提供 title 和 image");
  const sql = await getSql();
  const rows = await sql`
    insert into photos (title, description, image, group_name)
    values (${title}, ${asString(args.description)?.trim() ?? ""}, ${image}, ${asString(args.groupName)?.trim() || "日常"})
    returning id
  `;
  return jsonResult({ id: rows[0]?.id, title, image });
}

async function listPagesTool() {
  return jsonResult({ pages: await readPages() });
}

async function setFrontPageTool(userId: string, args: Record<string, unknown>) {
  await requireAdmin(userId);
  const page = asString(args.page);
  const visible = asBoolean(args.visible);
  if (!page || !isFrontPage(page)) throw new Error("page 只能是 moments、photos、archive、links");
  if (visible == null) throw new Error("请提供 visible");
  const current = await readPages();
  const next = { ...current, [page]: visible };
  const sql = await getSql();
  await sql`
    insert into site_settings (key, value, updated_at)
    values (${"front_pages"}, ${JSON.stringify(next)}, ${new Date().toISOString()})
    on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at
  `;
  return jsonResult({ pages: next });
}

async function addTopicTool(userId: string, args: Record<string, unknown>) {
  await requireAdmin(userId);
  const name = normalizeTopicName(asString(args.name) ?? "");
  if (!name) throw new Error("分类名不能为空");
  const current = await loadTopics();
  if (current.includes(name)) throw new Error("这个分类已经有了");
  if (current.length >= MAX_TOPICS) throw new Error("分类太多了");
  const next = [...current, name];
  const sql = await getSql();
  await sql`
    insert into site_settings (key, value, updated_at)
    values (${"topics"}, ${JSON.stringify(next)}, ${new Date().toISOString()})
    on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at
  `;
  return jsonResult({ topics: next });
}

async function getRevisionTool(userId: string, args: Record<string, unknown>) {
  const id = asNumber(args.id);
  if (!id) throw new Error("请提供 id");
  const sql = await getSql();
  const rows = await sql.query<{
    id: number;
    post_id: number;
    title: string;
    excerpt: string;
    body: string;
    editor_name: string;
    created_at: string;
    slug: string;
    user_id: string;
  }>(
    `select r.id, r.post_id, r.title, r.excerpt, r.body, r.editor_name, r.created_at, p.slug, p.user_id
     from post_revisions r join posts p on p.id = r.post_id
     where r.id = $1 limit 1`,
    [id],
  );
  const row = rows[0];
  if (!row) throw new Error("找不到这个版本");
  const actor = await getActor(userId);
  if (row.user_id !== userId && !actor.canEditAll) throw new Error("没有权限");
  return jsonResult({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    editorName: row.editor_name,
    createdAt: String(row.created_at),
  });
}

export async function listPostResources(userId: string, origin: string) {
  const actor = await getActor(userId);
  const posts = await listSyncPosts(userId, actor.canEditAll);
  return [
    { uri: "folio://site", name: "站点", mimeType: "application/json", description: "站点栏目与当前用户" },
    { uri: "folio://posts", name: "文章列表", mimeType: "application/json", description: "可管理的文章" },
    { uri: "folio://comments", name: "最近评论", mimeType: "application/json", description: "最新评论" },
    { uri: "folio://moments", name: "瞬间", mimeType: "application/json", description: "瞬间列表" },
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
  if (uri === "folio://comments") {
    const result = await listCommentsTool({ limit: 30 });
    return { mimeType: "application/json", text: result.content[0]?.text ?? "{}" };
  }
  if (uri === "folio://moments") {
    const result = await listMomentsTool({ limit: 20 });
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
