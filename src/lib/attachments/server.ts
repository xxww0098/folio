import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getActor } from "@/lib/roles";
import { EDITORIAL_USER_ID } from "@/lib/blog/seed";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type AttachmentBackend = "pg" | "s3" | "file";

export type AttachmentItem = {
  id: number;
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  alt: string;
  groupName: string;
  stored: boolean;
  backend: AttachmentBackend;
  createdAt: string;
};

type AttachmentRow = {
  id: number;
  user_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  alt: string;
  group_name: string;
  stored?: boolean;
  backend?: string | null;
  created_at: string;
};

function toBackend(value: string | null | undefined, stored: boolean): AttachmentBackend {
  if (value === "s3" || value === "pg" || value === "file") return value;
  return stored ? "pg" : "file";
}

function toItem(row: AttachmentRow): AttachmentItem {
  const stored = Boolean(row.stored);
  return {
    id: row.id,
    userId: row.user_id,
    filename: row.filename,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes ?? 0),
    url: row.url,
    alt: row.alt,
    groupName: row.group_name,
    stored,
    backend: toBackend(row.backend, stored),
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date(row.created_at).toISOString(),
  };
}

const SEED_FILES: Array<{ filename: string; url: string; alt: string }> = [
  { filename: "01-ts.jpg", url: "/covers/01-ts.jpg", alt: "夜间书桌上微微发亮的笔记本" },
  { filename: "02-rust.jpg", url: "/covers/02-rust.jpg", alt: "雨后石阶上的水光" },
  { filename: "03-go.jpg", url: "/covers/03-go.jpg", alt: "夜间书桌" },
  { filename: "04-python.jpg", url: "/covers/04-python.jpg", alt: "一碗还烫的汤" },
  { filename: "05-sql.jpg", url: "/covers/05-sql.jpg", alt: "编辑台灯" },
  { filename: "06-zig.jpg", url: "/covers/06-zig.jpg", alt: "窗台蕨" },
  { filename: "07-arch.jpg", url: "/covers/07-arch.jpg", alt: "未封的信" },
];

export async function ensureAttachmentsSeeded() {
  const sql = await getSql();
  const existing = await sql<{ count: number }>`select count(*)::int as count from attachments`;
  if ((existing[0]?.count ?? 0) > 0) return;
  for (const seed of SEED_FILES) {
    await sql`
      insert into attachments (user_id, filename, mime_type, size_bytes, url, alt, group_name)
      values (${EDITORIAL_USER_ID}, ${seed.filename}, ${"image/jpeg"}, ${0}, ${seed.url}, ${seed.alt}, ${"封面"})
    `;
  }
}

async function objectStore() {
  return import("../../../scripts/object-storage.mjs");
}

export async function saveAttachmentBytes(input: {
  userId: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
  alt?: string;
  groupName?: string;
}): Promise<AttachmentItem> {
  if (!ALLOWED.has(input.mimeType)) throw new Error("只支持 JPG / PNG / WebP / GIF");
  if (input.bytes.length > MAX_BYTES) throw new Error("文件不能超过 2 MB");
  if (input.bytes.length < 24) throw new Error("文件无效");
  const sql = await getSql();
  const store = await objectStore();
  const resolved = await store.loadResolvedStorage((text, params) => sql.query(text, params));
  const useS3 = resolved.driver === "s3" && resolved.ready;
  const safeName = input.filename.replace(/[^\w.\u4e00-\u9fff-]+/g, "_").slice(0, 60);
  const inserted = await sql`
    insert into attachments (user_id, filename, mime_type, size_bytes, url, alt, group_name, data)
    values (
      ${input.userId}, ${safeName}, ${input.mimeType}, ${input.bytes.length},
      ${"/api/files/pending"}, ${input.alt ?? ""}, ${input.groupName?.trim() || "Obsidian"},
      ${useS3 ? null : input.bytes}
    )
    returning id, user_id, filename, mime_type, size_bytes, url, alt, group_name, created_at
  `;
  const row = inserted[0] as AttachmentRow;
  const url = `/api/files/${row.id}`;
  let objectKey: string | null = null;
  if (useS3) {
    objectKey = store.objectKey(resolved.config.prefix, row.id, safeName);
    try {
      await store.putObjectBytes(resolved.config, {
        key: objectKey,
        body: input.bytes,
        mime: input.mimeType,
      });
    } catch (error) {
      await sql`delete from attachments where id = ${row.id}`;
      throw error;
    }
  }
  await sql`
    update attachments
    set url = ${url}, object_key = ${objectKey}
    where id = ${row.id}
  `;
  return toItem({
    ...row,
    url,
    stored: true,
    backend: useS3 ? "s3" : "pg",
  });
}

export async function readAttachmentFile(id: number): Promise<{ mime: string; url: string; bytes: Buffer } | null> {
  const sql = await getSql();
  const rows = await sql.query<{
    mime_type: string;
    url: string;
    data: Buffer | Uint8Array | null;
    object_key: string | null;
  }>(`select mime_type, url, data, object_key from attachments where id = $1`, [id]);
  const row = rows[0];
  if (!row) return null;
  if (row.data && (row.data as Buffer | Uint8Array).length) {
    return { mime: row.mime_type, url: row.url, bytes: Buffer.from(row.data) };
  }
  if (row.object_key) {
    const store = await objectStore();
    const resolved = await store.loadResolvedStorage((text, params) => sql.query(text, params));
    if (resolved.config.publicBase) {
      const publicUrl = store.publicObjectUrl(resolved.config.publicBase, row.object_key);
      if (publicUrl) return { mime: row.mime_type, url: publicUrl, bytes: Buffer.alloc(0) };
    }
    if (resolved.config.bucket && resolved.config.accessKey && resolved.config.secretKey) {
      try {
        const bytes = await store.getObjectBytes(resolved.config, row.object_key);
        if (bytes?.length) return { mime: row.mime_type, url: row.url, bytes };
      } catch {
        return null;
      }
    }
    return null;
  }
  const bytes = row.data ? Buffer.from(row.data) : Buffer.alloc(0);
  return { mime: row.mime_type, url: row.url, bytes };
}

function parseBase64Payload(dataBase64: string, fallbackMime: string) {
  const trimmed = dataBase64.trim();
  const match = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
  if (match) {
    return { mime: match[1], bytes: Buffer.from(match[2], "base64") };
  }
  const comma = trimmed.indexOf(",");
  if (trimmed.startsWith("data:") && comma > 0) {
    return { mime: fallbackMime, bytes: Buffer.from(trimmed.slice(comma + 1), "base64") };
  }
  return { mime: fallbackMime, bytes: Buffer.from(trimmed, "base64") };
}

export const listAttachments = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<AttachmentItem[]> => {
    const sql = await getSql();
    const rows = await sql.query<AttachmentRow>(
      `select id, user_id, filename, mime_type, size_bytes, url, alt, group_name, created_at,
              (data is not null or object_key is not null) as stored,
              case
                when object_key is not null then 's3'
                when data is not null then 'pg'
                else 'file'
              end as backend
       from attachments
       order by created_at desc`,
    );
    return rows.map(toItem);
  });

export const uploadAttachment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      filename: z.string().trim().min(1).max(80),
      mimeType: z.string().trim().min(1).max(80),
      dataBase64: z.string().min(24),
      alt: z.string().trim().max(80).optional(),
      groupName: z.string().trim().max(24).optional(),
    }),
  )
  .handler(async ({ context, data }): Promise<AttachmentItem> => {
    const parsed = parseBase64Payload(data.dataBase64, data.mimeType);
    return saveAttachmentBytes({
      userId: context.userId,
      filename: data.filename,
      mimeType: ALLOWED.has(data.mimeType) ? data.mimeType : parsed.mime,
      bytes: parsed.bytes,
      alt: data.alt,
      groupName: data.groupName,
    });
  });

export const deleteAttachment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => id)
  .handler(async ({ context, data: id }): Promise<{ ok: true }> => {
    const actor = await getActor(context.userId);
    const sql = await getSql();
    const rows = await sql.query<{ user_id: string; stored: boolean; object_key: string | null }>(
      `select user_id, (data is not null or object_key is not null) as stored, object_key
       from attachments where id = $1`,
      [id],
    );
    const row = rows[0];
    if (!row) throw new Error("找不到附件");
    if (row.user_id !== context.userId && !actor.canEditAll) throw new Error("没有权限");
    if (!row.stored) throw new Error("站点封面不能删除");
    await sql`delete from attachments where id = ${id}`;
    if (row.object_key) {
      try {
        const store = await objectStore();
        const resolved = await store.loadResolvedStorage((text, params) => sql.query(text, params));
        if (resolved.config.bucket && resolved.config.secretKey) {
          await store.deleteObjectBytes(resolved.config, row.object_key);
        }
      } catch {
        /* keep the row gone even if the object lingers */
      }
    }
    return { ok: true };
  });

export const publishAttachmentUrl = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ src: z.string().trim().min(1).max(500) }))
  .handler(async ({ context, data }): Promise<{ url: string }> => {
    const store = await objectStore();
    const id = store.attachmentIdFromSrc(data.src);
    if (!id) throw new Error("这张图还不是站点附件");
    const actor = await getActor(context.userId);
    const sql = await getSql();
    const rows = await sql.query<{
      user_id: string;
      filename: string;
      mime_type: string;
      data: Buffer | Uint8Array | null;
      object_key: string | null;
    }>(`select user_id, filename, mime_type, data, object_key from attachments where id = $1`, [id]);
    const row = rows[0];
    if (!row) throw new Error("找不到这张图");
    if (row.user_id !== context.userId && !actor.canEditAll) throw new Error("没有权限");
    const resolved = await store.loadResolvedStorage((text, params) => sql.query(text, params));
    if (!resolved.config.bucket || !resolved.config.accessKey || !resolved.config.secretKey) {
      throw new Error("先在控制台打开对象存储");
    }
    let key = row.object_key?.trim() || "";
    if (!key) {
      const bytes = row.data ? Buffer.from(row.data) : Buffer.alloc(0);
      if (!bytes.length) throw new Error("站点封面请先上传到附件库");
      key = store.objectKey(resolved.config.prefix, id, row.filename);
      await store.putObjectBytes(resolved.config, {
        key,
        body: bytes,
        mime: row.mime_type || "application/octet-stream",
      });
      await sql.query(`update attachments set object_key = $1, data = null, url = $2 where id = $3`, [
        key,
        `/api/files/${id}`,
        id,
      ]);
    }
    const url = store.publicObjectUrlFromConfig(resolved.config, key);
    if (!url) throw new Error("请在存储页填写公开前缀");
    return { url };
  });
