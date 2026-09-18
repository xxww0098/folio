import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight, jsonOk, requireApiUserId } from "@/lib/obsidian/http";
import { getActor } from "@/lib/roles";
import { displayNameFor } from "@/lib/profile";
import { getSql } from "@/lib/db";

export const Route = createFileRoute("/api/obsidian/me")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ request }) => {
        const userId = await requireApiUserId(request);
        if (userId instanceof Response) return userId;
        const actor = await getActor(userId);
        const sql = await getSql();
        const name = await displayNameFor(sql, userId, "作者");
        return jsonOk({
          ok: true,
          userId,
          name,
          role: actor.role,
        });
      },
    },
  },
});
