#!/usr/bin/env node
/**
 * Docker first-boot: backend entrance + the single owner account.
 * Prints one banner (address / email / password) like a panel install.
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { ensureAdmin } from "./ensure-admin.mjs";
import { ensureEntrance, entranceHref, originFromEnv } from "./ensure-entrance.mjs";

export function formatInitLines({
  origin,
  path,
  createdEntrance,
  createdAdmin,
  email,
  password,
}) {
  const href = entranceHref(origin, path);
  const address = href || `${String(origin).replace(/\/+$/, "")}/login`;
  const first = createdEntrance || createdAdmin;

  if (first) {
    const lines = [
      "[folio] ------------------------------------------------------------",
      "[folio] 安装完成，请打开浏览器访问：",
      `[folio]   地址    ${address}`,
    ];
    if (email) lines.push(`[folio]   邮箱    ${email}`);
    if (createdAdmin && password) {
      lines.push(`[folio]   密码    ${password}`);
      lines.push("[folio] 密码只显示这一次，请立刻保存。");
    }
    if (!href) {
      lines.push("[folio] 后台入口已关闭。控制台「入口」可重新开启。");
    } else {
      lines.push("[folio] 直接打开 /console 会显示 404。");
    }
    lines.push("[folio] ------------------------------------------------------------");
    return lines;
  }

  const later = [];
  if (href) later.push(`[folio] 后台入口  ${href}`);
  else later.push("[folio] 后台入口已关闭。控制台「入口」可重新开启。");
  if (email) later.push(`[folio] 管理员    ${email}`);
  return later;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.log("[folio] 无 DATABASE_URL，跳过主机初始化。");
    return;
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    const entrance = await ensureEntrance(client);
    const admin = await ensureAdmin(client);
    for (const line of formatInitLines({
      origin: originFromEnv(),
      path: entrance.path,
      createdEntrance: entrance.created,
      createdAdmin: admin.created,
      email: admin.email,
      password: admin.password,
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
    console.error("[folio] 主机初始化失败:", err?.message || err);
    process.exit(1);
  });
}
