import { resolveApiUserId } from "./auth";
import { authFailDelay, authLock, clientAuthKey, noteAuthFailure, noteAuthSuccess } from "./token-guard";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
};

export function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS });
}

export function jsonOk(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export function jsonError(message: string, status: number) {
  return jsonOk({ error: message }, status);
}

export function requestOrigin(request: Request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

export async function requireApiUserId(request: Request): Promise<string | Response> {
  const key = clientAuthKey(request, request.headers.get("authorization") ?? "");
  const lock = authLock(key);
  if (lock.locked) {
    return new Response(JSON.stringify({ error: "尝试过多，请稍后再试" }), {
      status: 429,
      headers: {
        ...CORS,
        "Content-Type": "application/json; charset=utf-8",
        "Retry-After": String(lock.retryAfterSec),
      },
    });
  }
  const userId = await resolveApiUserId(request);
  if (!userId) {
    noteAuthFailure(key);
    await authFailDelay();
    return jsonError("请提供有效的个人令牌（Authorization: Bearer folio_…）", 401);
  }
  noteAuthSuccess(key);
  return userId;
}

export function asErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "请求失败";
  if (message === "Unauthorized") return jsonError("请先登录或提供个人令牌", 401);
  if (message.includes("没有权限") || message.includes("占用")) return jsonError(message, 403);
  if (message.includes("找不到")) return jsonError(message, 404);
  return jsonError(message, 400);
}
