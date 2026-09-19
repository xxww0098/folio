import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getActor } from "@/lib/roles";
import { DEFAULT_TOPICS, MAX_TOPICS, normalizeTopicName, parseTopics } from "./catalog";

const SETTING_KEY = "topics";

async function readTopics(): Promise<string[]> {
  const sql = await getSql();
  const rows = await sql.query<{ value: string }>(`select value from site_settings where key = $1 limit 1`, [SETTING_KEY]);
  return parseTopics(rows[0]?.value);
}

async function writeTopics(topics: string[]) {
  const sql = await getSql();
  const value = JSON.stringify(topics);
  await sql`
    insert into site_settings (key, value, updated_at)
    values (${SETTING_KEY}, ${value}, ${new Date().toISOString()})
    on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at
  `;
  return topics;
}

export async function loadTopics(): Promise<string[]> {
  try {
    return await readTopics();
  } catch {
    return [...DEFAULT_TOPICS];
  }
}

export async function assertKnownTopic(name: string) {
  const topics = await loadTopics();
  if (!topics.includes(name.trim())) throw new Error("未知分类");
  return topics;
}

export const getTopics = createServerFn({ method: "GET" }).handler(async (): Promise<string[]> => {
  return loadTopics();
});

export const addTopic = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ name: z.string().trim().min(1).max(20) }))
  .handler(async ({ context, data }): Promise<string[]> => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) throw new Error("只有管理员可以改分类");
    const name = normalizeTopicName(data.name);
    if (!name) throw new Error("分类名不能为空");
    const current = await readTopics();
    if (current.includes(name)) throw new Error("这个分类已经有了");
    if (current.length >= MAX_TOPICS) throw new Error("分类太多了");
    return writeTopics([...current, name]);
  });

export const renameTopic = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ from: z.string().trim().min(1).max(20), to: z.string().trim().min(1).max(20) }))
  .handler(async ({ context, data }): Promise<string[]> => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) throw new Error("只有管理员可以改分类");
    const from = normalizeTopicName(data.from);
    const to = normalizeTopicName(data.to);
    if (!from || !to) throw new Error("分类名不能为空");
    const current = await readTopics();
    if (!current.includes(from)) throw new Error("找不到这个分类");
    if (from !== to && current.includes(to)) throw new Error("这个分类已经有了");
    const next = current.map((item) => (item === from ? to : item));
    if (from !== to) {
      const sql = await getSql();
      await sql`update posts set topic = ${to} where topic = ${from}`;
    }
    return writeTopics(next);
  });

export const removeTopic = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ name: z.string().trim().min(1).max(20) }))
  .handler(async ({ context, data }): Promise<string[]> => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) throw new Error("只有管理员可以改分类");
    const name = normalizeTopicName(data.name);
    const current = await readTopics();
    if (current.length <= 1) throw new Error("至少保留一个分类");
    if (!current.includes(name)) return current;
    const sql = await getSql();
    const used = await sql.query<{ n: string }>(`select count(*)::text as n from posts where topic = $1 and deleted_at is null`, [name]);
    if (Number(used[0]?.n ?? 0) > 0) throw new Error("还有文章在用这个分类");
    return writeTopics(current.filter((item) => item !== name));
  });
