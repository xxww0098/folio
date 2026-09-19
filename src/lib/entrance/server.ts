import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { optionalAuthMiddleware } from "@/lib/membership/session";
import { getActor, type Role } from "@/lib/roles";
import {
  cookieMatchesEntrance,
  encodeEntrance,
  ENTRANCE_COOKIE,
  generateEntrance,
  parseEntrance,
  sameSecret,
} from "./core";

const SETTING_KEY = "console_entrance";

async function readEntrance(): Promise<string> {
  const sql = await getSql();
  const rows = await sql.query<{ value: string }>(
    `select value from site_settings where key = $1 limit 1`,
    [SETTING_KEY],
  );
  return rows[0]?.value?.trim() ?? "";
}

async function writeEntrance(value: string) {
  const sql = await getSql();
  await sql`
    insert into site_settings (key, value, updated_at)
    values (${SETTING_KEY}, ${value}, ${new Date().toISOString()})
    on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at
  `;
}

async function readEntranceCookie() {
  const { getCookie } = await import("@tanstack/react-start/server");
  return getCookie(ENTRANCE_COOKIE) ?? "";
}

function cookieAttrs() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false,
  };
}

async function emitEntranceCookie(value: string) {
  const { setCookie } = await import("@tanstack/react-start/server");
  setCookie(ENTRANCE_COOKIE, encodeEntrance(value), cookieAttrs());
}

async function clearEntranceCookie() {
  const { deleteCookie } = await import("@tanstack/react-start/server");
  deleteCookie(ENTRANCE_COOKIE, { path: "/" });
}

async function staffBypasses(userId: string | null | undefined) {
  if (!userId) return false;
  const actor = await getActor(userId);
  return actor.canEditAll;
}

export async function isBackendUnlocked(userId?: string | null) {
  const entrance = await readEntrance();
  if (!entrance) return true;
  if (cookieMatchesEntrance(await readEntranceCookie(), entrance)) return true;
  return staffBypasses(userId);
}

export const getBackendAccess = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }): Promise<{ unlocked: boolean }> => {
    return { unlocked: await isBackendUnlocked(context.userId) };
  });

export const getWorkspaceAccess = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }) => {
    let role: Role | null = null;
    let isStaff = false;
    let isAdmin = false;
    let canWrite = false;
    if (context.userId) {
      const actor = await getActor(context.userId);
      role = actor.role;
      isStaff = actor.canEditAll;
      isAdmin = actor.isAdmin;
      canWrite = actor.canWrite;
    }
    return {
      unlocked: await isBackendUnlocked(context.userId),
      signedIn: Boolean(context.userId),
      role,
      isStaff,
      isAdmin,
      canWrite,
    };
  });

export const claimEntrance = createServerFn({ method: "GET" })
  .validator(z.object({ entry: z.string().max(116) }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const entrance = await readEntrance();
    if (!entrance || !sameSecret(data.entry, entrance)) return { ok: false };
    await emitEntranceCookie(entrance);
    return { ok: true };
  });

export type EntranceSettings = {
  enabled: boolean;
  value: string;
};

export const getEntranceSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<EntranceSettings> => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) return { enabled: false, value: "" };
    const value = await readEntrance();
    return { enabled: Boolean(value), value };
  });

export const setEntranceSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ value: z.string().max(116) }))
  .handler(async ({ context, data }): Promise<EntranceSettings> => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) throw new Error("只有管理员可以修改入口");
    const parsed = parseEntrance(data.value);
    if (!parsed.ok) throw new Error(parsed.error);
    await writeEntrance(parsed.value);
    if (parsed.value) await emitEntranceCookie(parsed.value);
    else await clearEntranceCookie();
    return { enabled: Boolean(parsed.value), value: parsed.value };
  });

export const rotateEntrance = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<EntranceSettings> => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) throw new Error("只有管理员可以修改入口");
    const value = generateEntrance();
    await writeEntrance(value);
    await emitEntranceCookie(value);
    return { enabled: true, value };
  });
