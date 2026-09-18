import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

export type FriendLink = {
  id: number;
  name: string;
  url: string;
  description: string;
  groupName: string;
};

const SEED_LINKS = [
  { name: "TypeScript", url: "https://www.typescriptlang.org/docs/", description: "语言手册", group: "工具", sort: 1 },
  { name: "MDN", url: "https://developer.mozilla.org", description: "Web 技术文档", group: "工具", sort: 2 },
  { name: "少数派", url: "https://sspai.com", description: "高效工作，品质生活", group: "阅读", sort: 3 },
  { name: "阮一峰的网络日志", url: "https://www.ruanyifeng.com/blog/", description: "科技与人文", group: "阅读", sort: 4 },
];

export async function ensureLinksSeeded() {
  const sql = await getSql();
  await sql`
    update friend_links
    set name = ${"TypeScript"},
        url = ${"https://www.typescriptlang.org/docs/"},
        description = ${"语言手册"}
    where url like ${"%halo.run%"}
  `;
  const existing = await sql<{ count: number }>`select count(*)::int as count from friend_links`;
  if ((existing[0]?.count ?? 0) > 0) return;
  for (const link of SEED_LINKS) {
    await sql`
      insert into friend_links (name, url, description, group_name, sort_order)
      values (${link.name}, ${link.url}, ${link.description}, ${link.group}, ${link.sort})
    `;
  }
}

function toLink(row: { id: number; name: string; url: string; description: string; group_name: string }): FriendLink {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description,
    groupName: row.group_name,
  };
}

export const listFriendLinks = createServerFn({ method: "GET" }).handler(async (): Promise<FriendLink[]> => {
  await ensureLinksSeeded();
  const sql = await getSql();
  const rows = await sql.query<{
    id: number;
    name: string;
    url: string;
    description: string;
    group_name: string;
  }>(`select id, name, url, description, group_name from friend_links order by sort_order asc, id asc`);
  return rows.map(toLink);
});

export const createFriendLink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      name: z.string().trim().min(1).max(40),
      url: z.string().trim().url().max(300),
      description: z.string().trim().max(80).optional(),
      groupName: z.string().trim().min(1).max(12),
    }),
  )
  .handler(async ({ data }): Promise<FriendLink> => {
    const sql = await getSql();
    const rows = await sql`
      insert into friend_links (name, url, description, group_name, sort_order)
      values (${data.name}, ${data.url}, ${data.description ?? ""}, ${data.groupName}, ${99})
      returning id, name, url, description, group_name
    `;
    return toLink(rows[0] as Parameters<typeof toLink>[0]);
  });

export const deleteFriendLink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ data: id }): Promise<{ ok: true }> => {
    const sql = await getSql();
    await sql`delete from friend_links where id = ${id}`;
    return { ok: true };
  });
