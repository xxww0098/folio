import { DEFAULT_TOPICS } from "@/lib/topics/catalog";
import { loadTopics } from "@/lib/topics/server";
import { MCP_PROMPTS, MCP_TOOLS, promptByName, toolByName } from "./catalog";
import { callTool, listPostResources, readResource } from "./ops";
import {
  asNumber,
  asObject,
  asString,
  isNotification,
  isSupportedVersion,
  jsonResult,
  parseMcpBody,
  rpcError,
  rpcResult,
  unsupportedVersionError,
  MCP_META,
  MCP_PROTOCOL_VERSION,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  MCP_SUPPORTED_VERSIONS,
  RPC,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from "./protocol";

export type McpContext = {
  userId: string;
  origin: string;
  protocolHeader?: string;
  mcpMethod?: string;
  mcpName?: string;
};

export type HandleOutcome =
  | { kind: "response"; body: JsonRpcResponse | JsonRpcResponse[] }
  | { kind: "accepted" }
  | { kind: "error"; status: number; body: JsonRpcResponse };

const LIST_TTL_MS = 300_000;
const RETIRED_METHODS = new Set(["initialize", "ping", "logging/setLevel", "notifications/initialized"]);

export { parseMcpBody };

function readMeta(message: JsonRpcRequest) {
  const params = asObject(message.params);
  return { ...asObject(message._meta), ...asObject(params._meta) };
}

function expectedMcpName(method: string, params: Record<string, unknown>) {
  if (method === "tools/call") return asString(params.name) ?? "";
  if (method === "prompts/get") return asString(params.name) ?? "";
  if (method === "resources/read") return asString(params.uri) ?? "";
  if (method === "server/discover") return "server";
  return method.split("/").pop() ?? method;
}

export async function handleMcpMessages(messages: JsonRpcRequest[], ctx: McpContext): Promise<HandleOutcome> {
  const responses: JsonRpcResponse[] = [];
  for (const message of messages) {
    if (isNotification(message)) continue;
    responses.push(await handleRequest(message, ctx));
  }
  if (!responses.length) return { kind: "accepted" };
  return { kind: "response", body: messages.length === 1 ? responses[0]! : responses };
}

async function handleRequest(message: JsonRpcRequest, ctx: McpContext): Promise<JsonRpcResponse> {
  if (message.jsonrpc !== "2.0" && message.jsonrpc !== undefined) {
    return rpcError(null, RPC.INVALID_REQUEST, "jsonrpc 必须是 2.0");
  }
  const id = message.id;
  if (typeof id !== "string" && typeof id !== "number") {
    return rpcError(null, RPC.INVALID_REQUEST, "请求 id 必须是字符串或数字");
  }
  const method = typeof message.method === "string" ? message.method : "";
  if (!method) return rpcError(id, RPC.INVALID_REQUEST, "缺少 method");
  if (RETIRED_METHODS.has(method)) {
    return rpcError(id, RPC.METHOD_NOT_FOUND, `${method} 已从 ${MCP_PROTOCOL_VERSION} 移除，请改用 server/discover`);
  }

  const params = asObject(message.params);
  const meta = readMeta(message);
  const fromMeta = asString(meta[MCP_META.protocolVersion]);
  const requested = ctx.protocolHeader || fromMeta;

  if (ctx.protocolHeader && fromMeta && ctx.protocolHeader !== fromMeta) {
    return rpcError(id, RPC.HEADER_MISMATCH, "协议版本请求头与 _meta 不一致", {
      header: ctx.protocolHeader,
      meta: fromMeta,
    });
  }
  if (requested && !isSupportedVersion(requested)) {
    return unsupportedVersionError(id, requested);
  }
  if (!requested && method !== "server/discover") {
    return rpcError(id, RPC.INVALID_PARAMS, `请声明协议版本 ${MCP_PROTOCOL_VERSION}`, {
      supported: [...MCP_SUPPORTED_VERSIONS],
    });
  }

  if (ctx.mcpMethod && ctx.mcpMethod !== method) {
    return rpcError(id, RPC.HEADER_MISMATCH, "Mcp-Method 与 JSON-RPC method 不一致", {
      header: ctx.mcpMethod,
      method,
    });
  }
  if (ctx.mcpName) {
    const expected = expectedMcpName(method, params);
    if (expected && ctx.mcpName !== expected && ctx.mcpName !== method) {
      return rpcError(id, RPC.HEADER_MISMATCH, "Mcp-Name 与方法参数不一致", {
        header: ctx.mcpName,
        expected,
      });
    }
  }

  try {
    switch (method) {
      case "server/discover":
        return rpcResult(id, await discoverResult());
      case "tools/list":
        return rpcResult(id, finishResult({ tools: MCP_TOOLS }, { list: true, scope: "public" }));
      case "tools/call":
        return rpcResult(id, finishResult(await invokeTool(params, ctx), { list: false }));
      case "resources/list":
        return rpcResult(
          id,
          finishResult({ resources: await listPostResources(ctx.userId, ctx.origin) }, { list: true, scope: "private" }),
        );
      case "resources/templates/list":
        return rpcResult(
          id,
          finishResult(
            {
              resourceTemplates: [
                {
                  uriTemplate: "folio://posts/{slug}",
                  name: "文章 Markdown",
                  mimeType: "text/markdown",
                  description: "按别名读取一篇文章的 Markdown",
                },
                {
                  uriTemplate: "folio://comments",
                  name: "最近评论",
                  mimeType: "application/json",
                  description: "站点最近评论",
                },
              ],
            },
            { list: true, scope: "public" },
          ),
        );
      case "resources/read": {
        const uri = asString(params.uri);
        if (!uri) return rpcError(id, RPC.INVALID_PARAMS, "缺少 uri");
        const resource = await readResource(uri, ctx);
        return rpcResult(id, finishResult({ contents: [{ uri, ...resource }] }, { list: true, scope: "private" }));
      }
      case "prompts/list":
        return rpcResult(id, finishResult({ prompts: MCP_PROMPTS }, { list: true, scope: "public" }));
      case "prompts/get":
        return rpcResult(id, finishResult(await getPrompt(params, ctx), { list: false }));
      default:
        return rpcError(id, RPC.METHOD_NOT_FOUND, `不支持 ${method}`);
    }
  } catch (error) {
    const text = error instanceof Error ? error.message : "内部错误";
    if (
      text.includes("没有权限") ||
      text.includes("找不到") ||
      text.includes("请提供") ||
      text.includes("太短") ||
      text.includes("过长") ||
      text.includes("只能")
    ) {
      return rpcError(id, RPC.INVALID_PARAMS, text);
    }
    return rpcError(id, RPC.INTERNAL, text);
  }
}

function serverInfo() {
  return { name: MCP_SERVER_NAME, title: "折页", version: MCP_SERVER_VERSION };
}

function finishResult(result: object, opts: { list: boolean; scope?: "public" | "private" }) {
  const record = result as Record<string, unknown>;
  return {
    resultType: "complete",
    ...record,
    _meta: { ...asObject(record._meta), [MCP_META.serverInfo]: serverInfo() },
    ...(opts.list ? { ttlMs: LIST_TTL_MS, cacheScope: opts.scope ?? "private" } : {}),
  };
}

async function discoverResult() {
  const topics = await loadTopics().catch(() => [...DEFAULT_TOPICS]);
  return {
    resultType: "complete",
    protocolVersion: MCP_PROTOCOL_VERSION,
    supportedVersions: [...MCP_SUPPORTED_VERSIONS],
    capabilities: {
      tools: { listChanged: false },
      resources: { subscribe: false, listChanged: false },
      prompts: { listChanged: false },
    },
    instructions: usageInstructions(topics),
    ttlMs: LIST_TTL_MS,
    cacheScope: "public",
    _meta: { [MCP_META.serverInfo]: serverInfo() },
  };
}

function usageInstructions(topics: string[]) {
  return (
    "折页是技术向中文独立博客。先调 server/discover。文章：list_posts / get_post / search_posts 读取；draft_post 存草稿，publish_post 或 set_post_status 发布。评论：list_comments / add_comment。瞬间：list_moments / create_moment。友链与图库：list_links、list_photos。栏目开关：list_pages / set_front_page。总览：site_overview。分类用 list_topics，必须是：" +
    topics.join("、") +
    "。代码围栏写成 ```ts:src/path.ts {3-5}。单独一行视频链接会变成播放器。阅读权限 access: public | early | paid。"
  );
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
              `栏目：${topic}（调用 list_topics 确认）`,
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

  if (name === "write_moment") {
    const note = asString(args.note) || "今天把一件小事做对了";
    return {
      description: def.description,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `把下面这件事写成折页瞬间，中文，一两句，不超过 280 字，不要标签和标题。写完调用 create_moment。\n\n${note}`,
          },
        },
      ],
    };
  }

  if (name === "reply_to_comment") {
    const slug = asString(args.slug);
    if (!slug) throw new Error("请提供 slug");
    const listed = await callTool("list_comments", { slug, limit: 12 }, ctx);
    const commentId = asString(args.commentId) || asNumber(args.commentId);
    return {
      description: def.description,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `为文章 \`${slug}\` 起草一条评论回复。`,
              commentId ? `优先回复评论 id ${commentId}。` : "挑一条值得回的。",
              "语气像工程师，短句，不要客套。写完调用 add_comment，带上 slug 和 parentId。",
              "",
              listed.content[0]?.text ?? "",
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
