export const MCP_PROTOCOL_VERSION = "2025-03-26";
export const MCP_SERVER_NAME = "folio";
export const MCP_SERVER_VERSION = "1.1.0";

const SUPPORTED_VERSIONS = new Set([
  "2024-11-05",
  "2025-03-26",
  "2025-11-25",
  "2026-07-28",
]);

export function pickProtocolVersion(requested: unknown): string {
  if (typeof requested === "string" && SUPPORTED_VERSIONS.has(requested)) return requested;
  return MCP_PROTOCOL_VERSION;
}

export type JsonRpcId = string | number | null;

export type JsonRpcRequest = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: unknown;
  params?: unknown;
};

export type JsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: JsonRpcError;
};

export type TextContent = { type: "text"; text: string };

export type CallToolResult = {
  content: TextContent[];
  structuredContent?: unknown;
  isError?: boolean;
};

export const RPC = {
  PARSE: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
  UNAUTHORIZED: -32001,
} as const;

export function rpcError(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: data === undefined ? { code, message } : { code, message, data } };
}

export function rpcResult(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

export function isNotification(message: JsonRpcRequest) {
  return message.id === undefined;
}

export function jsonResult(data: unknown, isError = false): CallToolResult {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text", text }],
    structuredContent: typeof data === "string" ? undefined : data,
    ...(isError ? { isError: true } : {}),
  };
}

export function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

export function parseMcpBody(raw: string): { messages: JsonRpcRequest[] } | { error: JsonRpcResponse } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: rpcError(null, RPC.PARSE, "JSON 无法解析") };
  }
  if (Array.isArray(parsed)) {
    if (!parsed.length) return { error: rpcError(null, RPC.INVALID_REQUEST, "空的批量请求") };
    return { messages: parsed as JsonRpcRequest[] };
  }
  if (parsed && typeof parsed === "object") return { messages: [parsed as JsonRpcRequest] };
  return { error: rpcError(null, RPC.INVALID_REQUEST, "请求体必须是 JSON 对象") };
}
