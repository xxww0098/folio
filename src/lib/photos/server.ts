import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { sweepGhostAttachmentsQuietly } from "@/lib/attachments/server";

export type PhotoItem = {
  id: number;
  title: string;
  description: string;
  image: string;
  groupName: string;
  takenAt: string;
};

function toPhoto(row: {
  id: number;
  title: string;
  description: string;
  image: string;
  group_name: string;
  taken_at: string;
}): PhotoItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    image: row.image,
    groupName: row.group_name,
    takenAt: typeof row.taken_at === "string" ? row.taken_at : new Date(row.taken_at).toISOString(),
  };
}

export const listPhotos = createServerFn({ method: "GET" }).handler(async (): Promise<PhotoItem[]> => {
  const sql = await getSql();
  const rows = await sql.query<{
    id: number;
    title: string;
    description: string;
    image: string;
    group_name: string;
    taken_at: string;
  }>(`select id, title, description, image, group_name, taken_at from photos order by taken_at desc`);
  return rows.map(toPhoto);
});

export const createPhoto = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      title: z.string().trim().min(1).max(40),
      description: z.string().trim().max(120).optional(),
      image: z.string().trim().min(1).max(300),
      groupName: z.string().trim().min(1).max(12),
    }),
  )
  .handler(async ({ data }): Promise<PhotoItem> => {
    const sql = await getSql();
    const rows = await sql`
      insert into photos (title, description, image, group_name)
      values (${data.title}, ${data.description ?? ""}, ${data.image}, ${data.groupName})
      returning id, title, description, image, group_name, taken_at
    `;
    return toPhoto(rows[0] as Parameters<typeof toPhoto>[0]);
  });

export const deletePhoto = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ data: id }): Promise<{ ok: true }> => {
    const sql = await getSql();
    await sql`delete from photos where id = ${id}`;
    await sweepGhostAttachmentsQuietly();
    return { ok: true };
  });
