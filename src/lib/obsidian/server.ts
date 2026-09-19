import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getActor } from "@/lib/roles";
import { listUserTokens, createUserToken, revokeUserToken } from "./tokens";
import { listSyncPosts, publishMarkdown, pullMarkdown } from "./sync";

export type { TokenRow } from "./tokens";

export const listObsidianTokens = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => listUserTokens(context.userId));

export const createObsidianToken = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ name: z.string().trim().min(1).max(32) }))
  .handler(async ({ context, data }) => createUserToken(context.userId, data.name));

export const revokeObsidianToken = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }) => {
    await revokeUserToken(context.userId, data.id);
    return { ok: true as const };
  });

export const publishObsidianMarkdown = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ markdown: z.string().min(8).max(80000), origin: z.string().url() }))
  .handler(async ({ context, data }) => publishMarkdown(context.userId, data.markdown, data.origin));

export const listObsidianPosts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const actor = await getActor(context.userId);
    return listSyncPosts(context.userId, actor.canEditAll);
  });

export const pullObsidianPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ slug: z.string().min(1), origin: z.string().url() }))
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    const markdown = await pullMarkdown(context.userId, data.slug, data.origin, actor.canEditAll);
    if (!markdown) throw new Error("找不到这篇文章");
    return { markdown };
  });
