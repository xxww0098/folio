import type { Sql } from "@/lib/db";
import { getSql } from "@/lib/db";
import { EDITORIAL_NAME, EDITORIAL_USER_ID, SEED_POST_TAGS } from "./seed";
import { makeTagSlug, type PostListItem, type RecentComment, type TagRef } from "./types";

const SEED_PHOTOS = [
  { title: "纸与晨光", description: "旧书、米纸，和一角还没被写满的桌面。", image: "/covers/01-paper.jpg", group: "书桌", at: "2026-09-12T08:00:00.000Z" },
  { title: "雨后石阶", description: "水填进缝里，石头的年龄才显出来。", image: "/covers/02-rain.jpg", group: "城市", at: "2026-09-08T10:00:00.000Z" },
  { title: "夜间书桌", description: "台灯把世界缩小到一叠稿件那么大。", image: "/covers/03-desk.jpg", group: "书桌", at: "2026-09-02T11:30:00.000Z" },
  { title: "一碗汤", description: "完成，是蒸汽还在、碗壁还烫。", image: "/covers/04-bowl.jpg", group: "生活", at: "2026-08-26T09:00:00.000Z" },
  { title: "编辑台灯", description: "夜里最适合处理句子。", image: "/covers/05-lamp.jpg", group: "书桌", at: "2026-08-18T13:00:00.000Z" },
  { title: "窗台蕨", description: "它不催你，只在缺水时轻轻垂下。", image: "/covers/06-fern.jpg", group: "生活", at: "2026-08-09T08:40:00.000Z" },
  { title: "未封的信", description: "有些话适合被写成信，不适合被发送。", image: "/covers/07-letter.jpg", group: "书桌", at: "2026-07-30T12:00:00.000Z" },
];

export async function ensureSiteExtras() {
  const sql = await getSql();
  await ensureTags(sql);
  await ensurePhotos(sql);
  await ensureDemoComments(sql);
}

async function ensureTags(sql: Sql) {
  const names = [...new Set(Object.values(SEED_POST_TAGS).flat())];
  for (const name of names) {
    const slug = makeTagSlug(name);
    await sql`insert into tags (name, slug) values (${name}, ${slug}) on conflict (name) do nothing`;
  }
  for (const [postSlug, tags] of Object.entries(SEED_POST_TAGS)) {
    const posts = await sql.query<{ id: number }>(`select id from posts where slug = $1 limit 1`, [postSlug]);
    const postId = posts[0]?.id;
    if (!postId) continue;
    await sql`delete from post_tags where post_id = ${postId}`;
    for (const name of tags) {
      const tag = await sql.query<{ id: number }>(`select id from tags where name = $1 limit 1`, [name]);
      const tagId = tag[0]?.id;
      if (!tagId) continue;
      await sql`insert into post_tags (post_id, tag_id) values (${postId}, ${tagId}) on conflict do nothing`;
    }
  }
  await sql`delete from tags where id not in (select tag_id from post_tags)`;
}

async function ensurePhotos(sql: Sql) {
  const existing = await sql<{ count: number }>`select count(*)::int as count from photos`;
  if ((existing[0]?.count ?? 0) > 0) return;
  for (const photo of SEED_PHOTOS) {
    await sql`
      insert into photos (title, description, image, group_name, taken_at)
      values (${photo.title}, ${photo.description}, ${photo.image}, ${photo.group}, ${photo.at})
    `;
  }
}

async function ensureDemoComments(sql: Sql) {
  const existing = await sql<{ count: number }>`select count(*)::int as count from comments`;
  if ((existing[0]?.count ?? 0) > 0) {
    await sql`
      update comments
      set body = ${"判别联合写完之后，非法状态在编译期就过不去了。这篇可以直接当 checklist。"}
      where body like ${"%纸边的光%"}
    `;
    await sql`
      update comments
      set body = ${"对。类型系统该做的事就是把口头约定写进联合。"}
      where body like ${"%空白也是句子%"}
    `;
    return;
  }
  const posts = await sql.query<{ id: number }>(`select id from posts where slug = 'ts-discriminated-unions' limit 1`);
  const postId = posts[0]?.id;
  if (!postId) return;
  const parent = await sql`
    insert into comments (post_id, user_id, author_name, body, created_at)
    values (${postId}, ${EDITORIAL_USER_ID}, ${"读者阿南"}, ${"判别联合写完之后，非法状态在编译期就过不去了。这篇可以直接当 checklist。"}, ${"2026-09-13T14:20:00.000Z"})
    returning id
  `;
  const parentId = (parent[0] as { id: number } | undefined)?.id;
  if (!parentId) return;
  await sql`
    insert into comments (post_id, user_id, author_name, body, parent_id, created_at)
    values (${postId}, ${EDITORIAL_USER_ID}, ${EDITORIAL_NAME}, ${"对。类型系统该做的事就是把口头约定写进联合。"}, ${parentId}, ${"2026-09-13T16:02:00.000Z"})
  `;
}

export async function replacePostTags(sql: Sql, postId: number, names: string[]) {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))].slice(0, 8);
  await sql`delete from post_tags where post_id = ${postId}`;
  for (const name of unique) {
    const slug = makeTagSlug(name);
    await sql`insert into tags (name, slug) values (${name}, ${slug}) on conflict (name) do nothing`;
    const tag = await sql.query<{ id: number }>(`select id from tags where name = $1 limit 1`, [name]);
    const tagId = tag[0]?.id;
    if (!tagId) continue;
    await sql`insert into post_tags (post_id, tag_id) values (${postId}, ${tagId}) on conflict do nothing`;
  }
}

export async function attachTags(sql: Sql, posts: PostListItem[]): Promise<PostListItem[]> {
  if (posts.length === 0) return posts;
  const ids = posts.map((post) => post.id);
  const placeholders = ids.map((_, index) => `$${index + 1}`).join(", ");
  const rows = await sql.query<{ post_id: number; name: string; slug: string }>(
    `select pt.post_id, t.name, t.slug
     from post_tags pt
     join tags t on t.id = pt.tag_id
     where pt.post_id in (${placeholders})
     order by t.name asc`,
    ids,
  );
  const map = new Map<number, TagRef[]>();
  for (const row of rows) {
    const list = map.get(row.post_id) ?? [];
    list.push({ name: row.name, slug: row.slug });
    map.set(row.post_id, list);
  }
  return posts.map((post) => ({ ...post, tags: map.get(post.id) ?? [] }));
}

export async function fetchTagCloud(sql: Sql): Promise<Array<TagRef & { count: number }>> {
  const rows = await sql.query<{ name: string; slug: string; count: number }>(
    `select t.name, t.slug, count(pt.post_id)::int as count
     from tags t
     join post_tags pt on pt.tag_id = t.id
     join posts p on p.id = pt.post_id and p.status = 'published' and p.deleted_at is null
     group by t.id, t.name, t.slug
     having count(pt.post_id) > 0
     order by count desc, t.name asc`,
  );
  return rows.map((row) => ({ name: row.name, slug: row.slug, count: Number(row.count) }));
}

export async function fetchRecentComments(sql: Sql): Promise<RecentComment[]> {
  const rows = await sql.query<{
    id: number;
    author_name: string;
    body: string;
    created_at: string;
    title: string;
    slug: string;
  }>(
    `select c.id, c.author_name, c.body, c.created_at, p.title, p.slug
     from comments c
     join posts p on p.id = c.post_id
     where p.status = 'published' and p.deleted_at is null and c.parent_id is null
     order by c.created_at desc
     limit 5`,
  );
  return rows.map((row) => ({
    id: row.id,
    authorName: row.author_name,
    body: row.body,
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date(row.created_at).toISOString(),
    postTitle: row.title,
    postSlug: row.slug,
  }));
}
