import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight, jsonError, jsonOk, requestOrigin, requireApiUserId } from "@/lib/obsidian/http";
import { getActor } from "@/lib/roles";
import { pullMarkdown } from "@/lib/obsidian/sync";

export const Route = createFileRoute("/api/obsidian/posts/$slug")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ request, params }) => {
        const userId = await requireApiUserId(request);
        if (userId instanceof Response) return userId;
        const actor = await getActor(userId);
        const markdown = await pullMarkdown(userId, params.slug, requestOrigin(request), actor.canEditAll);
        if (!markdown) return jsonError("找不到这篇文章", 404);
        return jsonOk({ slug: params.slug, markdown });
      },
    },
  },
});
