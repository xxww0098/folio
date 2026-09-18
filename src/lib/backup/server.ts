import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  applySnapshot,
  collectSnapshot,
  hydrateAttachmentBytes,
  snapshotStorageSettings,
} from "../../../scripts/backup.mjs";
import {
  getObjectBytes,
  loadResolvedStorage,
  parseStoredValue,
  pushPgBytesToS3,
  resolveStorage,
} from "../../../scripts/object-storage.mjs";
import { authMiddleware } from "@/lib/auth/middleware";
import { dbSource, getPglite, getSql } from "@/lib/db";
import { getActor } from "@/lib/roles";

type QueryFn = (text: string, params?: unknown[]) => Promise<Array<Record<string, unknown>>>;

async function withTransaction<T>(fn: (query: QueryFn) => Promise<T>): Promise<T> {
  if (dbSource === "neon") {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      await client.query("begin");
      try {
        const result = await fn(async (text, params) => (await client.query(text, params)).rows);
        await client.query("commit");
        return result;
      } catch (error) {
        try {
          await client.query("rollback");
        } catch {
          /* ignore */
        }
        throw error;
      }
    } finally {
      await client.end();
    }
  }
  const lite = await getPglite();
  return lite.transaction(async (tx) =>
    fn(async (text, params) => {
      const result = await tx.query(text, params);
      return result.rows as Array<Record<string, unknown>>;
    }),
  );
}

export const exportSnapshot = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) throw new Error("只有管理员可以导出");
    const sql = await getSql();
    const snapshot = await collectSnapshot((text, params) => sql.query(text, params), {
      appVersion: process.env.VITE_FOLIO_VERSION ?? "",
    });
    const resolved = resolveStorage(parseStoredValue(snapshotStorageSettings(snapshot)));
    if (resolved.config.bucket && resolved.config.accessKey && resolved.config.secretKey) {
      await hydrateAttachmentBytes(snapshot, (key) => getObjectBytes(resolved.config, key));
    }
    return { json: JSON.stringify(snapshot) };
  });

export const importSnapshot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ json: z.string().min(2).max(80_000_000) }))
  .handler(async ({ context, data }) => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) throw new Error("只有管理员可以导入");
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.json);
    } catch {
      throw new Error("文件不是 JSON");
    }
    const result = await withTransaction((query) => applySnapshot(query, parsed));
    const sql = await getSql();
    const resolved = await loadResolvedStorage((text, params) => sql.query(text, params));
    if (resolved.driver === "s3" && resolved.ready) {
      await pushPgBytesToS3((text, params) => sql.query(text, params), resolved.config);
    }
    return {
      posts: result.counts.posts ?? 0,
      attachments: result.counts.attachments ?? 0,
    };
  });
