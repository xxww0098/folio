import { createFileRoute } from "@tanstack/react-router";
import { asErrorResponse, corsPreflight, jsonError, jsonOk, requestOrigin, requireApiUserId } from "@/lib/obsidian/http";
import { saveAttachmentBytes } from "@/lib/attachments/server";

export const Route = createFileRoute("/api/obsidian/images")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      POST: async ({ request }) => {
        const userId = await requireApiUserId(request);
        if (userId instanceof Response) return userId;
        let payload: { filename?: unknown; mimeType?: unknown; dataBase64?: unknown };
        try {
          payload = (await request.json()) as typeof payload;
        } catch {
          return jsonError("请求体必须是 JSON", 400);
        }
        const filename = typeof payload.filename === "string" ? payload.filename : "";
        const mimeType = typeof payload.mimeType === "string" ? payload.mimeType : "";
        const dataBase64 = typeof payload.dataBase64 === "string" ? payload.dataBase64 : "";
        if (!filename || !dataBase64) return jsonError("缺少文件名或内容", 400);
        const trimmed = dataBase64.trim();
        const match = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
        const bytes = Buffer.from(match ? match[2] : trimmed.includes(",") ? trimmed.slice(trimmed.indexOf(",") + 1) : trimmed, "base64");
        const mime = match?.[1] || mimeType || "image/jpeg";
        try {
          const item = await saveAttachmentBytes({
            userId,
            filename,
            mimeType: mime,
            bytes,
            alt: filename.replace(/\.[^.]+$/, ""),
            groupName: "Obsidian",
          });
          const origin = requestOrigin(request);
          return jsonOk({
            id: item.id,
            filename: item.filename,
            url: item.url,
            permalink: `${origin}${item.url}`,
          });
        } catch (error) {
          return asErrorResponse(error);
        }
      },
    },
  },
});
