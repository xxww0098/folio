import { getSessionUser } from "@/lib/auth/verify.server";
import { userIdFromToken } from "./tokens";

export async function resolveApiUserId(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  if (bearer.startsWith("folio_")) {
    const { isFolioToken } = await import("./token-guard");
    if (!isFolioToken(bearer)) return null;
    return userIdFromToken(bearer);
  }

  const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
  try {
    assertSameSiteRequest();
  } catch {
    return null;
  }
  const session = await getSessionUser(bearer || undefined);
  return session?.id ?? null;
}
