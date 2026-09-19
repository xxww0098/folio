import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { etag } from "hono/etag";
import { secureHeaders } from "hono/secure-headers";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { attachmentPermalink, saveAttachmentBytes, serveAttachment } from "@/lib/attachments/server";
import { getPostBySlug, listPublishedPosts, searchPublishedPosts } from "@/lib/blog/server";
import type { PostListItem } from "@/lib/blog/types";
import { getSql } from "@/lib/db";
import { handleMcpMessages, parseMcpBody, unauthorizedResponse } from "@/lib/mcp/handler";
import { mcpAccepted, mcpJson, mcpUnauthorized, requestOrigin, requireMcpUserId } from "@/lib/mcp/http";
import { MCP_PROTOCOL_VERSION, RPC } from "@/lib/mcp/protocol";
import { asErrorResponse, jsonError, requireApiUserId } from "@/lib/obsidian/http";
import { listSyncPosts, publishMarkdown, pullMarkdown } from "@/lib/obsidian/sync";
import { getFrontPages } from "@/lib/pages/server";
import { displayNameFor } from "@/lib/profile";
import { CURRENT_VERSION } from "@/lib/release";
import { getActor } from "@/lib/roles";
import { loadTopics } from "@/lib/topics/server";

export type ApiEnv = {
  Variables: {
    userId: string;
    origin: string;
  };
};

const markdownBody = z.object({
  markdown: z.string().min(8).max(80000),
});

const imageBody = z.object({
  filename: z.string().trim().min(1).max(80),
  mimeType: z.string().max(80).optional(),
  dataBase64: z.string().min(24),
});

function publicPost(post: PostListItem) {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    topic: post.topic,
    tags: post.tags,
    coverImage: post.coverImage,
    publishedAt: post.publishedAt,
    readingMinutes: post.readingMinutes,
    accessMode: post.accessMode,
    exclusive: post.exclusive,
    commentCount: post.commentCount,
    likeCount: post.likeCount,
    viewCount: post.viewCount,
  };
}

const harden = secureHeaders({
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  originAgentCluster: false,
  referrerPolicy: "no-referrer",
  strictTransportSecurity: false,
  xContentTypeOptions: true,
  xDnsPrefetchControl: "off",
  xDownloadOptions: true,
  xFrameOptions: "SAMEORIGIN",
  xPermittedCrossDomainPolicies: false,
  xXssProtection: false,
});

const apiCors = cors({
  origin: "*",
  allowHeaders: [
    "Authorization",
    "Content-Type",
    "Accept",
    "MCP-Protocol-Version",
    "Mcp-Method",
    "Mcp-Name",
  ],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["MCP-Protocol-Version", "ETag"],
  maxAge: 86400,
});

const stripFingerprints: MiddlewareHandler = async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Dns-Prefetch-Control", "off");
  c.res.headers.delete("X-Powered-By");
  c.res.headers.delete("Server");
};

const publicCache: MiddlewareHandler = async (c, next) => {
  await next();
  if (c.req.method === "GET" && c.res.ok && !c.res.headers.has("Cache-Control")) {
    c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  }
};

const api = new Hono<ApiEnv>()
  .use("*", harden)
  .use("*", apiCors)
  .use("*", stripFingerprints)
  .use("*", publicCache)
  .get("/health", (c) =>
    c.json({
      ok: true,
      name: "folio",
      version: CURRENT_VERSION.replace(/^v/, ""),
    }),
  )
  .get("/topics", async (c) => c.json({ topics: await loadTopics() }))
  .get("/pages", async (c) => c.json({ pages: await getFrontPages() }))
  .get("/posts", etag(), async (c) => {
    const q = c.req.query("q")?.trim() ?? "";
    const posts = q ? await searchPublishedPosts({ data: q }) : await listPublishedPosts();
    return c.json({ posts: posts.map(publicPost) });
  })
  .get("/posts/:slug", etag(), async (c) => {
    const slug = c.req.param("slug");
    const post = await getPostBySlug({ data: slug });
    if (!post) return c.json({ error: "找不到这篇文章" }, 404);
    return c.json({
      post: {
        ...publicPost(post),
        body: post.body,
        access: post.access,
      },
    });
  })
  .get("/files/:id", async (c) => serveAttachment(Number(c.req.param("id")), c.req.raw))
  .get("/files/:id/:name", async (c) => serveAttachment(Number(c.req.param("id")), c.req.raw));

const tokenApi = new Hono<ApiEnv>()
  .use("*", harden)
  .use("*", apiCors)
  .use("*", stripFingerprints)
  .use("/images", bodyLimit({ maxSize: 10 * 1024 * 1024 }))
  .use("*", bodyLimit({ maxSize: 2 * 1024 * 1024 }))
  .use("*", async (c, next) => {
    const userId = await requireApiUserId(c.req.raw);
    if (userId instanceof Response) return userId;
    c.set("userId", userId);
    c.set("origin", requestOrigin(c.req.raw));
    await next();
  })
  .get("/me", async (c) => {
    const userId = c.get("userId");
    const actor = await getActor(userId);
    const sql = await getSql();
    const name = await displayNameFor(sql, userId, "站长");
    return c.json({ ok: true, userId, name, role: actor.role });
  })
  .get("/posts", async (c) => {
    const userId = c.get("userId");
    const actor = await getActor(userId);
    const posts = await listSyncPosts(userId, actor.canEditAll);
    return c.json({ posts });
  })
  .put("/posts", zValidator("json", markdownBody), async (c) => {
    const userId = c.get("userId");
    const actor = await getActor(userId);
    if (!actor.canWrite) return c.json({ error: "没有权限" }, 403);
    try {
      const { markdown } = c.req.valid("json");
      const result = await publishMarkdown(userId, markdown, c.get("origin"));
      return c.json(result);
    } catch (error) {
      return asErrorResponse(error);
    }
  })
  .get("/posts/:slug", async (c) => {
    const userId = c.get("userId");
    const actor = await getActor(userId);
    const slug = c.req.param("slug");
    const markdown = await pullMarkdown(userId, slug, c.get("origin"), actor.canEditAll);
    if (!markdown) return jsonError("找不到这篇文章", 404);
    return c.json({ slug, markdown });
  })
  .post("/images", zValidator("json", imageBody), async (c) => {
    const userId = c.get("userId");
    const { filename, mimeType, dataBase64 } = c.req.valid("json");
    const trimmed = dataBase64.trim();
    const match = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
    const bytes = Buffer.from(
      match ? match[2] : trimmed.includes(",") ? trimmed.slice(trimmed.indexOf(",") + 1) : trimmed,
      "base64",
    );
    try {
      const item = await saveAttachmentBytes({
        userId,
        filename,
        mimeType: match?.[1] || mimeType || "image/jpeg",
        bytes,
        alt: filename.replace(/\.[^.]+$/, ""),
        groupName: "Obsidian",
      });
      const permalink = attachmentPermalink(item.url, c.get("origin"));
      return c.json({ id: item.id, filename: item.filename, url: permalink, permalink });
    } catch (error) {
      return asErrorResponse(error);
    }
  });

const mcp = new Hono()
  .use("*", harden)
  .use("*", apiCors)
  .use("*", stripFingerprints)
  .on("OPTIONS", "/", () => new Response(null, { status: 204 }))
  .get("/", (c) =>
    c.json({
      name: "folio",
      title: "折页",
      transport: "streamable-http",
      endpoint: "/api/mcp",
      protocolVersion: MCP_PROTOCOL_VERSION,
      supportedVersions: [MCP_PROTOCOL_VERSION],
      docs: "/mcp",
    }),
  )
  .post("/", async (c) => {
    const userId = await requireMcpUserId(c.req.raw);
    if (userId instanceof Response) {
      const raw = await c.req.text().catch(() => "");
      let id: string | number | null = null;
      try {
        const parsed = JSON.parse(raw) as { id?: string | number | null };
        if (typeof parsed.id === "string" || typeof parsed.id === "number") id = parsed.id;
      } catch {
        id = null;
      }
      return mcpUnauthorized(unauthorizedResponse(id));
    }
    const raw = await c.req.text();
    if (!raw.trim()) {
      return mcpJson(
        { jsonrpc: "2.0", id: null, error: { code: RPC.INVALID_REQUEST, message: "请求体为空" } },
        400,
      );
    }
    const parsed = parseMcpBody(raw);
    if ("error" in parsed) return mcpJson(parsed.error, 400);
    const origin = requestOrigin(c.req.raw);
    const outcome = await handleMcpMessages(parsed.messages, {
      userId,
      origin,
      protocolHeader: c.req.header("mcp-protocol-version") ?? undefined,
      mcpMethod: c.req.header("mcp-method") ?? undefined,
      mcpName: c.req.header("mcp-name") ?? undefined,
    });
    if (outcome.kind === "accepted") return mcpAccepted();
    if (outcome.kind === "error") return mcpJson(outcome.body, outcome.status);
    return mcpJson(outcome.body, 200);
  });

export const app = new Hono()
  .route("/api/obsidian", tokenApi)
  .route("/api/mcp", mcp)
  .route("/api", api);

export type AppType = typeof app;
