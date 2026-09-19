import { randomBytes } from "node:crypto";
import { TOPICS } from "@/lib/blog/types";
import { MCP_PROMPTS, MCP_TOOLS, promptByName, toolByName } from "./catalog";
import { callTool, listPostResources, readResource } from "./ops";
import {
  asObject,
  asString,
  isNotification,
  jsonResult,
  parseMcpBody,
  pickProtocolVersion,
  rpcError,
  rpcResult,
  MCP_PROTOCOL_VERSION,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  RPC,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from "./protocol";

export type McpContext = {
  userId: string;
  origin: string;
};

export type HandleOutcome =
  | { kind: "response"; body: JsonRpcResponse | JsonRpcResponse[]; sessionId: string }
  | { kind: "accepted"; sessionId: string }
  | { kind: "error"; status: number; body: JsonRpcResponse; sessionId: string };

export function newSessionId() {
  return randomBytes(24).toString("base64url");
}

export { parseMcpBody };

export async function handleMcpMessages(
  messages: JsonRpcRequest[],
  ctx: McpContext,
  sessionId: string,
): Promise<HandleOutcome> {
  const responses: JsonRpcResponse[] = [];
  for (const message of messages) {
    if (isNotification(message)) {
      continue;
    }
    responses.push(await handleRequest(message, ctx));
  }
  if (!responses.length) return { kind: "accepted", sessionId };
  return { kind: "response", body: messages.length === 1 ? responses[0]! : responses, sessionId };
}

async function handleRequest(message: JsonRpcRequest, ctx: McpContext): Promise<JsonRpcResponse> {
  const id = message.id ?? null;
  if (message.jsonrpc !== "2.0" && message.jsonrpc !== undefined) {
    return rpcError(id, RPC.INVALID_REQUEST, "jsonrpc 必须是 2.0");
  }
  const method = typeof message.method === "string" ? message.method : "";
  if (!method) return rpcError(id, RPC.INVALID_REQUEST, "缺少 method");
  const params = asObject(message.params);

  try {
    switch (method) {
      case "initialize":
        return rpcResult(id, initializeResult(params));
      case "ping":
        return rpcResult(id, {});
      case "tools/list":
        return rpcResult(id, { tools: MCP_TOOLS });
      case "tools/call":
        return rpcResult(id, await invokeTool(params, ctx));
      case "resources/list":
        return rpcResult(id, { resources: await listPostResources(ctx.userId, ctx.origin) });
      case "resources/templates/list":
        return rpcResult(id, {
          resourceTemplates: [
            {
              uriTemplate: "folio://posts/{slug}",
              name: "文章 Markdown",
              mimeType: "text/markdown",
              description: "按别名读取一篇文章的 Markdown",
            },
          ],
        });
      case "resources/read": {
        const uri = asString(params.uri);
        if (!uri) return rpcError(id, RPC.INVALID_PARAMS, "缺少 uri");
        const resource = await readResource(uri, ctx);
        return rpcResult(id, { contents: [{ uri, ...resource }] });
      }
      case "prompts/list":
        return rpcResult(id, { prompts: MCP_PROMPTS });
      case "prompts/get":
        return rpcResult(id, await getPrompt(params, ctx));
      case "logging/setLevel":
        return rpcResult(id, {});
      default:
        return rpcError(id, RPC.METHOD_NOT_FOUND, `不支持 ${method}`);
    }
  } catch (error) {
    const text = error instanceof Error ? error.message : "内部错误";
    if (text.includes("没有权限")) return rpcError(id, RPC.INVALID_PARAMS, text);
    if (text.includes("找不到")) return rpcError(id, RPC.INVALID_PARAMS, text);
    if (text.includes("请提供") || text.includes("太短") || text.includes("过长") || text.includes("只能")) {
      return rpcError(id, RPC.INVALID_PARAMS, text);
    }
    return rpcError(id, RPC.INTERNAL, text);
  }
}

function initializeResult(params: Record<string, unknown>) {
  const protocolVersion = pickProtocolVersion(params.protocolVersion);
  return {
    protocolVersion,
    capabilities: {
      tools: { listChanged: false },
      resources: { subscribe: false, listChanged: false },
      prompts: { listChanged: false },
    },
    serverInfo: {
      name: MCP_SERVER_NAME,
      title: "折页",
      version: MCP_SERVER_VERSION,
    },
    instructions:
      "折页是技术向中文独立博客。用 list_posts / get_post / search_posts 读取。写新稿先 draft_post 存草稿（前台不可见），确认后再 publish_post 或 set_post_status 发布。update_post 局部修改，delete_post 进回收站。栏目必须是：" +
      TOPICS.join("、") +
      "。代码围栏写成 ```ts:src/path.ts {3-5}。阅读权限 access: public | early | paid。",
  };
}

async function invokeTool(params: Record<string, unknown>, ctx: McpContext) {
  const name = asString(params.name);
  if (!name) throw new Error("缺少工具名");
  if (!toolByName(name)) return jsonResult({ error: `未知工具：${name}` }, true);
  try {
    return await callTool(name, asObject(params.arguments), ctx);
  } catch (error) {
    const text = error instanceof Error ? error.message : "调用失败";
    return jsonResult({ error: text }, true);
  }
}

async function getPrompt(params: Record<string, unknown>, ctx: McpContext) {
  const name = asString(params.name);
  if (!name) throw new Error("缺少 prompt 名");
  const def = promptByName(name);
  if (!def) throw new Error(`未知 prompt：${name}`);
  const args = asObject(params.arguments);
  if (name === "draft_technical_post") {
    const topic = asString(args.topic) || "TypeScript";
    const title = asString(args.title) || "未命名";
    const thesis = asString(args.thesis) || "把一件具体的事讲清楚";
    const slugHint = title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    return {
      description: def.description,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `为折页起草一篇技术文章。`,
              `栏目：${topic}（必须是 ${TOPICS.join(" / ")} 之一）`,
              `标题：${title}`,
              `要讲清：${thesis}`,
              `写完整 Markdown，开头带 YAML：`,
              `title / slug（可用 ${slugHint || "topic-note"}）/ topic / tags / status: draft / access: public`,
              `正文用中文，短句，带至少一个语言围栏，格式：\`\`\`ts:src/example.ts`,
              `写完后调用 draft_post 存草稿。不要直接发布。不要空谈，给可运行的代码。`,
            ].join("\n"),
          },
        },
      ],
    };
  }

  const slug = asString(args.slug);
  const instruction = asString(args.instruction) || "润色并收紧";
  if (!slug) throw new Error("请提供 slug");
  const current = await callTool("get_post", { slug }, ctx);
  let markdown = "";
  if (!current.isError) {
    try {
      const parsed = JSON.parse(current.content[0]?.text ?? "{}") as { markdown?: string };
      markdown = parsed.markdown ?? current.content[0]?.text ?? "";
    } catch {
      markdown = current.content[0]?.text ?? "";
    }
  }
  return {
    description: def.description,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            `按下面的指令改写折页文章 \`${slug}\`。`,
            `指令：${instruction}`,
            `保持 YAML 头字段，代码围栏仍写语言和文件名。改完若仍是草稿调用 draft_post 或 update_post；要上线再 publish_post。`,
            ``,
            `当前稿件：`,
            markdown,
          ].join("\n"),
        },
      },
    ],
  };
}

export function unauthorizedResponse(id: JsonRpcRequest["id"] = null): JsonRpcResponse {
  return rpcError(id ?? null, RPC.UNAUTHORIZED, "请提供有效的个人令牌（Authorization: Bearer folio_…）");
}

export { MCP_PROTOCOL_VERSION };
