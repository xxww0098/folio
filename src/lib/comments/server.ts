import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { displayNameFor } from "@/lib/profile";
import { getActor } from "@/lib/roles";
import type { CommentItem } from "@/lib/blog/types";

type CommentRow = {
  id: number;
  post_id: number;
  user_id: string;
  author_name: string;
  body: string;
  parent_id: number | null;
  created_at: string;
};

function toComment(row: CommentRow): CommentItem {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    authorName: row.author_name,
    body: row.body,
    parentId: row.parent_id ?? null,
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date(row.created_at).toISOString(),
  };
}

export const listComments = createServerFn({ method: "GET" })
  .validator((postId: number) => postId)
  .handler(async ({ data: postId }): Promise<CommentItem[]> => {
    const sql = await getSql();
    const rows = await sql.query<CommentRow>(
      `select id, post_id, user_id, author_name, body, parent_id, created_at
       from comments where post_id = $1 order by created_at asc`,
      [postId],
    );
    return rows.map(toComment);
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      postId: z.number().int().positive(),
      body: z.string().trim().min(2).max(1000),
      parentId: z.number().int().positive().nullable().optional(),
    }),
  )
  .handler(async ({ context, data }): Promise<CommentItem> => {
    const sql = await getSql();
    const published = await sql.query<{ id: number; allow_comments: boolean }>(
      `select id, allow_comments from posts where id = $1 and status = 'published' and deleted_at is null`,
      [data.postId],
    );
    if (!published[0]) throw new Error("文章不存在或尚未刊出");
    if (published[0].allow_comments === false) throw new Error("本文已关闭评论");

    let parentId: number | null = data.parentId ?? null;
    if (parentId) {
      const parent = await sql.query<{ id: number; parent_id: number | null }>(
        `select id, parent_id from comments where id = $1 and post_id = $2`,
        [parentId, data.postId],
      );
      if (!parent[0]) throw new Error("回复的评论不存在");
      if (parent[0].parent_id) parentId = parent[0].parent_id;
    }

    const authorName = await displayNameFor(sql, context.userId, "读者");
    const rows = await sql`
      insert into comments (post_id, user_id, author_name, body, parent_id)
      values (${data.postId}, ${context.userId}, ${authorName}, ${data.body}, ${parentId})
      returning id, post_id, user_id, author_name, body, parent_id, created_at
    `;
    return toComment(rows[0] as CommentRow);
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }): Promise<{ ok: true }> => {
    const sql = await getSql();
    const actor = await getActor(context.userId);
    if (actor.canEditAll) {
      await sql`delete from comments where id = ${id}`;
    } else {
      await sql`
        delete from comments
        where id = ${id}
          and (
            user_id = ${context.userId}
            or post_id in (select id from posts where user_id = ${context.userId})
          )
      `;
    }
    return { ok: true };
  });
