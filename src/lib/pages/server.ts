import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getActor } from "@/lib/roles";
import {
  DEFAULT_FRONT_PAGES,
  FRONT_PAGES,
  parseFrontPages,
  type FrontPage,
  type FrontPageFlags,
} from "./visibility";

const SETTING_KEY = "front_pages";

async function readFrontPages(): Promise<FrontPageFlags> {
  const sql = await getSql();
  const rows = await sql.query<{ value: string }>(`select value from site_settings where key = $1 limit 1`, [SETTING_KEY]);
  return parseFrontPages(rows[0]?.value);
}

export const getFrontPages = createServerFn({ method: "GET" }).handler(async (): Promise<FrontPageFlags> => {
  try {
    return await readFrontPages();
  } catch {
    return { ...DEFAULT_FRONT_PAGES };
  }
});

export const setFrontPageVisible = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ page: z.enum(FRONT_PAGES), visible: z.boolean() }))
  .handler(async ({ context, data }): Promise<FrontPageFlags> => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) throw new Error("只有管理员可以改前台栏目");
    const current = await readFrontPages();
    const next = { ...current, [data.page]: data.visible };
    const sql = await getSql();
    await sql`
      insert into site_settings (key, value, updated_at)
      values (${SETTING_KEY}, ${JSON.stringify(next)}, ${new Date().toISOString()})
      on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at
    `;
    return next;
  });

export async function requirePublicPage(page: FrontPage) {
  let flags = DEFAULT_FRONT_PAGES;
  try {
    flags = await readFrontPages();
  } catch {
    flags = DEFAULT_FRONT_PAGES;
  }
  if (!flags[page]) throw notFound();
}

export type { FrontPage, FrontPageFlags };
