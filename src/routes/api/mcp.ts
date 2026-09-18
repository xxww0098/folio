import { createFileRoute } from "@tanstack/react-router";
import {
  handleMcpMessages,
  newSessionId,
  parseMcpBody,
  unauthorizedResponse,
} from "@/lib/mcp/handler";
import { mcpAccepted, mcpJson, mcpPreflight, mcpUnauthorized, requestOrigin, requireMcpUserId } from "@/lib/mcp/http";
import { RPC } from "@/lib/mcp/protocol";

function sessionFrom(request: Request) {
  const existing = request.headers.get("mcp-session-id")?.trim();
  if (existing && /^[\x21-\x7E]{8,128}$/.test(existing)) return existing;
  return newSessionId();
}

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      OPTIONS: () => mcpPreflight(),
      GET: async ({ request }) => {
        const accept = request.headers.get("accept") ?? "";
        if (accept.includes("text/event-stream")) {
          return mcpJson({ error: "此端点用 POST 返回 JSON，不提供长连接 SSE" }, 405);
        }
        return mcpJson(
          {
            name: "folio",
            title: "折页",
            transport: "streamable-http",
            endpoint: "/api/mcp",
            docs: "/mcp",
          },
          200,
        );
      },
      DELETE: async ({ request }) => {
        const userId = await requireMcpUserId(request);
        if (userId instanceof Response) return userId;
        return mcpJson({ ok: true }, 200, sessionFrom(request));
      },
      POST: async ({ request }) => {
        const userId = await requireMcpUserId(request);
        if (userId instanceof Response) {
          const raw = await request.text().catch(() => "");
          let id: string | number | null = null;
          try {
            const parsed = JSON.parse(raw) as { id?: string | number | null };
            if (typeof parsed.id === "string" || typeof parsed.id === "number") id = parsed.id;
          } catch {
            id = null;
          }
          return mcpUnauthorized(unauthorizedResponse(id));
        }

        const sessionId = sessionFrom(request);
        const raw = await request.text();
        if (!raw.trim()) {
          return mcpJson({ jsonrpc: "2.0", id: null, error: { code: RPC.INVALID_REQUEST, message: "请求体为空" } }, 400, sessionId);
        }
        const parsed = parseMcpBody(raw);
        if ("error" in parsed) return mcpJson(parsed.error, 400, sessionId);

        const origin = requestOrigin(request);
        const outcome = await handleMcpMessages(parsed.messages, { userId, origin }, sessionId);
        if (outcome.kind === "accepted") return mcpAccepted(outcome.sessionId);
        if (outcome.kind === "error") return mcpJson(outcome.body, outcome.status, outcome.sessionId);
        return mcpJson(outcome.body, 200, outcome.sessionId);
      },
    },
  },
});
