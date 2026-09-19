import { resolveApiUserId } from "@/lib/obsidian/auth";
import { requestOrigin } from "@/lib/obsidian/http";
import { authFailDelay, authLock, clientAuthKey, noteAuthFailure, noteAuthSuccess } from "@/lib/obsidian/token-guard";
import { unauthorizedResponse } from "./handler";
import { MCP_PROTOCOL_VERSION, type JsonRpcResponse } from "./protocol";

export const MCP_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, MCP-Protocol-Version, Mcp-Method, Mcp-Name",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "MCP-Protocol-Version",
};

export function mcpPreflight() {
  return new Response(null, { status: 204, headers: MCP_CORS });
}

export function mcpJson(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...MCP_CORS,
      "Content-Type": "application/json; charset=utf-8",
      "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
    },
  });
}

export function mcpAccepted() {
  return new Response(null, {
    status: 202,
    headers: {
      ...MCP_CORS,
      "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
    },
  });
}

export function mcpUnauthorized(body?: JsonRpcResponse) {
  return new Response(JSON.stringify(body ?? unauthorizedResponse(null)), {
    status: 401,
    headers: {
      ...MCP_CORS,
      "Content-Type": "application/json; charset=utf-8",
      "WWW-Authenticate": 'Bearer realm="folio"',
      "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
    },
  });
}

export function mcpTooMany(retryAfterSec: number) {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "尝试过多，请稍后再试" } }),
    {
      status: 429,
      headers: {
        ...MCP_CORS,
        "Content-Type": "application/json; charset=utf-8",
        "Retry-After": String(retryAfterSec),
        "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
      },
    },
  );
}

export async function requireMcpUserId(request: Request): Promise<string | Response> {
  const key = clientAuthKey(request, request.headers.get("authorization") ?? "");
  const lock = authLock(key);
  if (lock.locked) return mcpTooMany(lock.retryAfterSec);
  const userId = await resolveApiUserId(request);
  if (!userId) {
    noteAuthFailure(key);
    await authFailDelay();
    return mcpUnauthorized();
  }
  noteAuthSuccess(key);
  return userId;
}

export { requestOrigin };
