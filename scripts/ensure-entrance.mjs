#!/usr/bin/env node
/**
 * First-boot backend entrance. Docker entrypoint runs this after migrate.
 *
 * No row in site_settings → generate a random path, persist it, print the URL.
 * Row already there (including an admin-cleared empty value) → keep it.
 * No DATABASE_URL → skip (PGLite preview stays unlocked).
 */
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";

export const SETTING_KEY = "console_entrance";
const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const DEFAULT_ORIGIN = "http://localhost:8011";

export function generateEntranceValue(length = 10) {
  const size = Math.min(116, Math.max(5, length));
  const bytes = randomBytes(size);
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

export function originFromEnv(env = process.env) {
  const raw = String(env.BETTER_AUTH_URL ?? "").trim();
  return (raw || DEFAULT_ORIGIN).replace(/\/+$/, "");
}

export function entranceHref(origin, path) {
  const clean = String(path ?? "").trim();
  if (!clean) return "";
  return `${String(origin).replace(/\/+$/, "")}/${clean}`;
}

export function formatEntranceLines({ created, origin, path }) {
  const href = entranceHref(origin, path);
  if (!href) {
    return ["[folio] 后台入口已关闭。控制台「入口」可重新开启。"];
  }
  if (created) {
    return [
      "[folio] ------------------------------------------------------------",
      "[folio] 已生成后台入口，请立刻收藏：",
      `[folio]   ${href}`,
      "[folio] 直接打开 /console 会显示 404。",
      "[folio] ------------------------------------------------------------",
    ];
  }
  return [`[folio] 后台入口  ${href}`];
}

/**
 * @param {{ query: (text: string, params?: unknown[]) => Promise<{ rows: Array<{ value?: string }> }> }} client
 */
export async function ensureEntrance(client, generate = generateEntranceValue) {
  const existing = await client.query(`select value from site_settings where key = $1 limit 1`, [
    SETTING_KEY,
  ]);
  if (existing.rows[0]) {
    return { created: false, path: String(existing.rows[0].value ?? "").trim() };
  }
  const path = generate();
  await client.query(
    `insert into site_settings (key, value, updated_at)
     values ($1, $2, now())
     on conflict (key) do nothing`,
    [SETTING_KEY, path],
  );
  const again = await client.query(`select value from site_settings where key = $1 limit 1`, [
    SETTING_KEY,
  ]);
  return { created: true, path: String(again.rows[0]?.value ?? path).trim() };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.log("[folio] 无 DATABASE_URL，跳过后台入口初始化。");
    return;
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    const result = await ensureEntrance(client);
    for (const line of formatEntranceLines({
      created: result.created,
      origin: originFromEnv(),
      path: result.path,
    })) {
      console.log(line);
    }
  } finally {
    client.release();
    await pool.end();
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
    console.error("[folio] 后台入口初始化失败:", err?.message || err);
    process.exit(1);
  });
}
