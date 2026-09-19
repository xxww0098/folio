import { createFileRoute } from "@tanstack/react-router";
import { asErrorResponse, corsPreflight, jsonError, jsonOk, requestOrigin, requireApiUserId } from "@/lib/obsidian/http";
import { getActor } from "@/lib/roles";
import { listSyncPosts, publishMarkdown } from "@/lib/obsidian/sync";

export const Route = createFileRoute("/api/obsidian/posts")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ request }) => {
        const userId = await requireApiUserId(request);
        if (userId instanceof Response) return userId;
        const actor = await getActor(userId);
        const posts = await listSyncPosts(userId, actor.canEditAll);
        return jsonOk({ posts });
      },
      PUT: async ({ request }) => {
        const userId = await requireApiUserId(request);
        if (userId instanceof Response) return userId;
        let markdown = "";
        try {
          const body = (await request.json()) as { markdown?: unknown };
          markdown = typeof body.markdown === "string" ? body.markdown : "";
        } catch {
          return jsonError("请求体必须是 JSON，包含 markdown 字段", 400);
        }
        if (markdown.trim().length < 8) return jsonError("正文太短", 400);
        if (markdown.length > 80000) return jsonError("正文过长", 400);
        try {
          const actor = await getActor(userId);
          if (!actor.canWrite) return jsonError("没有投稿权限", 403);
          const result = await publishMarkdown(userId, markdown, requestOrigin(request));
          return jsonOk(result);
        } catch (error) {
          return asErrorResponse(error);
        }
      },
    },
  },
});
