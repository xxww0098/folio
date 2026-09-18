#!/usr/bin/env node
/**
 * Restore a snapshot from a file or stdin. Replaces all site data.
 *   docker compose exec -T folio node scripts/import-db.mjs < folio.json
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { applySnapshot, parseSnapshot, summarizeSnapshot } from "./backup.mjs";
import { loadResolvedStorage, pushPgBytesToS3 } from "./object-storage.mjs";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const source = process.argv[2];
  const rawText =
    source && source !== "-" ? await readFile(source, "utf8") : await readStdin();
  let parsedJson;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    throw new Error("文件不是 JSON");
  }
  const parsed = parseSnapshot(parsedJson);
  if (!parsed.ok) throw new Error(parsed.error);

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("[folio] 无 DATABASE_URL，无法导入。");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("begin");
    try {
      const result = await applySnapshot(
        async (text, params) => (await client.query(text, params)).rows,
        parsedJson,
      );
      await client.query("commit");
      const query = async (text, params) => (await client.query(text, params)).rows;
      const resolved = await loadResolvedStorage(query);
      if (resolved.driver === "s3" && resolved.ready) {
        const moved = await pushPgBytesToS3(query, resolved.config);
        if (moved.moved) console.error(`[folio] 已把 ${moved.moved} 个附件写入对象存储。`);
      }
      const summary = summarizeSnapshot(parsed.snapshot);
      console.error(
        `[folio] 已导入 ${result.counts.posts ?? 0} 篇文章、${result.counts.attachments ?? 0} 个附件（备份于 ${summary.exportedAt || "未知"}）。`,
      );
    } catch (err) {
      try {
        await client.query("rollback");
      } catch {
        /* ignore */
      }
      throw err;
    }
  } finally {
    await client.end();
  }
}

function invokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  main().catch((err) => {
    console.error("[folio] 导入失败:", err?.message || err);
    process.exit(1);
  });
}
