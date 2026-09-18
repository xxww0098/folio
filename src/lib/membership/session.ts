import { createMiddleware } from "@tanstack/react-start";

/**
 * Optional session for public reads (article body gating). Forwards the preview
 * bearer like authMiddleware, but never throws when signed out.
 */
export const optionalAuthMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser(context.bearerToken);
    return next({ context: { userId: user?.id ?? null as string | null } });
  });
