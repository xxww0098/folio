import { createFileRoute } from "@tanstack/react-router";
import { readAttachmentFile } from "@/lib/attachments/server";

export const Route = createFileRoute("/api/files/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const id = Number(params.id);
        if (!Number.isInteger(id) || id <= 0) return new Response("Not found", { status: 404 });
        const file = await readAttachmentFile(id);
        if (!file) return new Response("Not found", { status: 404 });
        if (!file.bytes.length && file.url) {
          return Response.redirect(new URL(file.url, request.url), 302);
        }
        if (!file.bytes.length) return new Response("Not found", { status: 404 });
        return new Response(Buffer.from(file.bytes), {
          headers: {
            "Content-Type": file.mime,
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
