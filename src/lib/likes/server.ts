import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

export const recordView = createServerFn({ method: "POST" })
  .validator((postId: number) => postId)
  .handler(async ({ data: postId }): Promise<{ ok: true }> => {
    const sql = await getSql();
    await sql`update posts set view_count = view_count + 1 where id = ${postId} and status = ${"published"}`;
    return { ok: true };
  });

export const getLikeState = createServerFn({ method: "GET" })
  .validator((postId: number) => postId)
  .handler(async ({ data: postId }): Promise<{ count: number; liked: boolean }> => {
    const sql = await getSql();
    const countRows = await sql.query<{ n: number }>(
      `select count(*)::int as n from post_likes where post_id = $1`,
      [postId],
    );
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser();
    let liked = false;
    if (user) {
      const mine = await sql.query<{ post_id: number }>(
        `select post_id from post_likes where post_id = $1 and user_id = $2 limit 1`,
        [postId, user.id],
      );
      liked = Boolean(mine[0]);
    }
    return { count: Number(countRows[0]?.n ?? 0), liked };
  });

export const toggleLike = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((postId: number) => postId)
  .handler(async ({ context, data: postId }): Promise<{ count: number; liked: boolean }> => {
    const sql = await getSql();
    const published = await sql.query<{ id: number }>(
      `select id from posts where id = $1 and status = 'published'`,
      [postId],
    );
    if (!published[0]) throw new Error("文章不存在");
    const existing = await sql.query<{ post_id: number }>(
      `select post_id from post_likes where post_id = $1 and user_id = $2 limit 1`,
      [postId, context.userId],
    );
    if (existing[0]) {
      await sql`delete from post_likes where post_id = ${postId} and user_id = ${context.userId}`;
    } else {
      await sql`insert into post_likes (post_id, user_id) values (${postId}, ${context.userId})`;
    }
    const countRows = await sql.query<{ n: number }>(
      `select count(*)::int as n from post_likes where post_id = $1`,
      [postId],
    );
    return { count: Number(countRows[0]?.n ?? 0), liked: !existing[0] };
  });
