import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { displayNameFor } from "@/lib/profile";
import { EDITORIAL_NAME, EDITORIAL_USER_ID } from "@/lib/blog/seed";

export type MomentItem = {
  id: number;
  userId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

type MomentRow = {
  id: number;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

const SEED_MOMENTS = [
  { body: "把 Upload 收成判别联合之后，loading 分支再也读不到 url。这才像类型系统该干的活。", at: "2026-09-16T09:12:00.000Z" },
  { body: "今天又看了一眼 EXPLAIN。Seq Scan 还在，说明索引列顺序写反了。", at: "2026-09-14T18:40:00.000Z" },
  { body: "select 里没有 default 才会阻塞。加上 default 的那版把 CPU 打满了。", at: "2026-09-10T21:05:00.000Z" },
];

function toMoment(row: MomentRow): MomentItem {
  return {
    id: row.id,
    userId: row.user_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date(row.created_at).toISOString(),
  };
}

export async function ensureMomentsSeeded() {
  const sql = await getSql();
  const literary = await sql<{ count: number }>`
    select count(*)::int as count from moments
    where user_id = ${EDITORIAL_USER_ID} and body like ${"%书桌擦干净%"}
  `;
  if ((literary[0]?.count ?? 0) > 0) {
    await sql`delete from moments where user_id = ${EDITORIAL_USER_ID}`;
  }
  const existing = await sql<{ count: number }>`select count(*)::int as count from moments`;
  if ((existing[0]?.count ?? 0) > 0) return;
  for (const moment of SEED_MOMENTS) {
    await sql`
      insert into moments (user_id, author_name, body, created_at)
      values (${EDITORIAL_USER_ID}, ${EDITORIAL_NAME}, ${moment.body}, ${moment.at})
    `;
  }
}

export const listMoments = createServerFn({ method: "GET" }).handler(async (): Promise<MomentItem[]> => {
  await ensureMomentsSeeded();
  const sql = await getSql();
  const rows = await sql.query<MomentRow>(
    `select id, user_id, author_name, body, created_at from moments order by created_at desc limit 40`,
  );
  return rows.map(toMoment);
});

export const createMoment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ body: z.string().trim().min(2).max(280) }))
  .handler(async ({ context, data }): Promise<MomentItem> => {
    const sql = await getSql();
    const authorName = await displayNameFor(sql, context.userId, "作者");
    const rows = await sql`
      insert into moments (user_id, author_name, body)
      values (${context.userId}, ${authorName}, ${data.body})
      returning id, user_id, author_name, body, created_at
    `;
    return toMoment(rows[0] as MomentRow);
  });

export const deleteMoment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }): Promise<{ ok: true }> => {
    const sql = await getSql();
    await sql`delete from moments where id = ${id} and user_id = ${context.userId}`;
    return { ok: true };
  });
