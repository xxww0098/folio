import { resolveApiUserId } from "@/lib/obsidian/auth";
import { requestOrigin } from "@/lib/obsidian/http";
import { unauthorizedResponse } from "./handler";
import { MCP_PROTOCOL_VERSION, type JsonRpcResponse } from "./protocol";

export const MCP_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id, Mcp-Method, Mcp-Name, Last-Event-ID",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, MCP-Protocol-Version",
};

export function mcpPreflight() {
  return new Response(null, { status: 204, headers: MCP_CORS });
}

export function mcpJson(body: unknown, status: number, sessionId?: string) {
  const headers = new Headers({
    ...MCP_CORS,
    "Content-Type": "application/json; charset=utf-8",
    "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
  });
  if (sessionId) headers.set("Mcp-Session-Id", sessionId);
  return new Response(JSON.stringify(body), { status, headers });
}

export function mcpAccepted(sessionId: string) {
  const headers = new Headers({
    ...MCP_CORS,
    "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
    "Mcp-Session-Id": sessionId,
  });
  return new Response(null, { status: 202, headers });
}

export function mcpUnauthorized(body?: JsonRpcResponse) {
  const headers = new Headers({
    ...MCP_CORS,
    "Content-Type": "application/json; charset=utf-8",
    "WWW-Authenticate": 'Bearer realm="folio"',
    "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
  });
  return new Response(JSON.stringify(body ?? unauthorizedResponse(null)), { status: 401, headers });
}

export async function requireMcpUserId(request: Request): Promise<string | Response> {
  const userId = await resolveApiUserId(request);
  if (!userId) return mcpUnauthorized();
  return userId;
}

export { requestOrigin };
