import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getActor } from "@/lib/roles";
import { CURRENT_VERSION, fetchLatestRelease, isNewerRelease } from "@/lib/release";
import { DEFAULT_AUTO_UPDATE, parseAutoUpdate, type AutoUpdateState } from "./core";

const SETTING_KEY = "auto_update";

export type UpdateStatus = AutoUpdateState & {
  current: string;
  latest: string | null;
  newer: boolean;
  url: string | null;
};

async function readState(): Promise<AutoUpdateState> {
  const sql = await getSql();
  const rows = await sql.query<{ value: string }>(`select value from site_settings where key = $1 limit 1`, [SETTING_KEY]);
  return parseAutoUpdate(rows[0]?.value);
}

async function writeState(state: AutoUpdateState) {
  const sql = await getSql();
  await sql`
    insert into site_settings (key, value, updated_at)
    values (${SETTING_KEY}, ${JSON.stringify(state)}, ${new Date().toISOString()})
    on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at
  `;
  return state;
}

async function statusFrom(state: AutoUpdateState): Promise<UpdateStatus> {
  let latest: string | null = state.lastTag;
  let url: string | null = null;
  try {
    const release = await fetchLatestRelease();
    if (release) {
      latest = release.tag;
      url = release.url;
      state = await writeState({
        ...state,
        lastCheckAt: new Date().toISOString(),
        lastTag: release.tag,
      });
    }
  } catch {
    /* keep last known tag */
  }
  return {
    ...state,
    current: CURRENT_VERSION.replace(/^v/, ""),
    latest,
    newer: Boolean(latest && isNewerRelease(CURRENT_VERSION, latest)),
    url,
  };
}

export const getAutoUpdate = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<UpdateStatus> => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) {
      return {
        ...DEFAULT_AUTO_UPDATE,
        current: CURRENT_VERSION.replace(/^v/, ""),
        latest: null,
        newer: false,
        url: null,
      };
    }
    try {
      return await statusFrom(await readState());
    } catch {
      return {
        ...DEFAULT_AUTO_UPDATE,
        current: CURRENT_VERSION.replace(/^v/, ""),
        latest: null,
        newer: false,
        url: null,
      };
    }
  });

export const setAutoUpdate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ enabled: z.boolean() }))
  .handler(async ({ context, data }): Promise<UpdateStatus> => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) throw new Error("只有管理员可以改自动更新");
    const current = await readState().catch(() => ({ ...DEFAULT_AUTO_UPDATE }));
    const next = await writeState({ ...current, enabled: data.enabled });
    return statusFrom(next);
  });
