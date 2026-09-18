#!/usr/bin/env node
/**
 * Dump the site to stdout (or -o file). Docker:
 *   docker compose exec -T folio node scripts/export-db.mjs > folio.json
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { collectSnapshot, hydrateAttachmentBytes, snapshotStorageSettings } from "./backup.mjs";
import { getObjectBytes, parseStoredValue, resolveStorage } from "./object-storage.mjs";

function parseArgs(argv) {
  /** @type {{ out: string | null }} */
  const opts = { out: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "-o" || argv[i] === "--out") {
      opts.out = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (argv[i] === "-h" || argv[i] === "--help") return { help: true, out: null };
  }
  return opts;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if ("help" in args) {
    console.error("usage: node scripts/export-db.mjs [-o folio.json]");
    return;
  }
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("[folio] 无 DATABASE_URL，无法导出。");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const snapshot = await collectSnapshot(
      async (text, params) => (await client.query(text, params)).rows,
      { appVersion: process.env.VITE_FOLIO_VERSION ?? "" },
    );
    const resolved = resolveStorage(parseStoredValue(snapshotStorageSettings(snapshot)));
    if (resolved.config.bucket && resolved.config.accessKey && resolved.config.secretKey) {
      const { filled } = await hydrateAttachmentBytes(snapshot, (key) => getObjectBytes(resolved.config, key));
      if (filled) console.error(`[folio] 已从对象存储补全 ${filled} 个附件。`);
    }
    const json = `${JSON.stringify(snapshot)}\n`;
    if (args.out) await writeFile(args.out, json);
    else process.stdout.write(json);
    const posts = snapshot.tables.posts?.length ?? 0;
    const files = snapshot.tables.attachments?.length ?? 0;
    console.error(`[folio] 已导出 ${posts} 篇文章、${files} 个附件。`);
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
    console.error("[folio] 导出失败:", err?.message || err);
    process.exit(1);
  });
}
