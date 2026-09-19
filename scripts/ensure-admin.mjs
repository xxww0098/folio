#!/usr/bin/env node
/**
 * First-boot owner account. Creates one credential admin when the user table
 * is empty. Later visitors can register as readers from the login page.
 *
 * No row in "user" → insert Better Auth user + credential account + admin role.
 * A user already there → leave them (never overwrite the password).
 * FOLIO_ADMIN_EMAIL / FOLIO_ADMIN_PASSWORD / FOLIO_ADMIN_NAME override the generated values.
 * No DATABASE_URL → skip (PGLite preview keeps federated login).
 */
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { hashPassword as betterAuthHashPassword } from "better-auth/crypto";
import pg from "pg";

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const LOCAL_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function generateSecret(length = 16, alphabet = ALPHABET) {
  const size = Math.max(1, length);
  const bytes = randomBytes(size);
  let out = "";
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return out;
}

export function generateAdminEmail() {
  return `${generateSecret(10, LOCAL_ALPHABET)}@folio.local`;
}

export function generateAdminPassword() {
  return generateSecret(16);
}

export function generateAuthId() {
  return generateSecret(32);
}

export function isAdminEmail(value) {
  return EMAIL_RE.test(String(value ?? "").trim());
}

export function credentialsFromEnv(env = process.env) {
  const email = String(env.FOLIO_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = String(env.FOLIO_ADMIN_PASSWORD ?? "");
  const name = String(env.FOLIO_ADMIN_NAME ?? "").trim();
  return {
    email: isAdminEmail(email) ? email : "",
    password: password.length >= 8 ? password : "",
    name: name.slice(0, 32),
  };
}

export function resolveAdminInput(env = process.env, generate = {}) {
  const rawEmail = String(env.FOLIO_ADMIN_EMAIL ?? "").trim();
  const rawPassword = String(env.FOLIO_ADMIN_PASSWORD ?? "");
  if (rawEmail && !isAdminEmail(rawEmail)) {
    throw new Error("FOLIO_ADMIN_EMAIL is not a valid email");
  }
  if (rawPassword && rawPassword.length < 8) {
    throw new Error("FOLIO_ADMIN_PASSWORD must be at least 8 characters");
  }
  const fromEnv = credentialsFromEnv(env);
  const email = fromEnv.email || (generate.email ?? generateAdminEmail)();
  const password = fromEnv.password || (generate.password ?? generateAdminPassword)();
  const name = fromEnv.name || "站长";
  return { email, password, name };
}

/**
 * @param {{ query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> }} client
 */
export async function ensureAdmin(client, options = {}) {
  const hash = options.hash ?? betterAuthHashPassword;
  const id = options.id ?? generateAuthId;
  const existing = await client.query(`select id, email from "user" order by "createdAt" asc limit 1`);
  if (existing.rows[0]) {
    return {
      created: false,
      id: String(existing.rows[0].id ?? ""),
      email: String(existing.rows[0].email ?? ""),
      password: "",
    };
  }

  const input = resolveAdminInput(options.env ?? process.env, options.generate ?? {});
  const userId = id();
  const accountId = id();
  const hashed = await hash(input.password);

  await client.query("begin");
  try {
    await client.query(
      `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
       values ($1, $2, $3, true, now(), now())`,
      [userId, input.name, input.email],
    );
    await client.query(
      `insert into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
       values ($1, $2, 'credential', $3, $4, now(), now())`,
      [accountId, userId, userId, hashed],
    );
    await client.query(
      `insert into user_roles (user_id, role) values ($1, 'admin') on conflict (user_id) do nothing`,
      [userId],
    );
    await client.query("commit");
  } catch (err) {
    try {
      await client.query("rollback");
    } catch {
      /* ignore */
    }
    throw err;
  }

  return { created: true, id: userId, email: input.email, password: input.password };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.log("[folio] 无 DATABASE_URL，跳过管理员初始化。");
    return;
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    const result = await ensureAdmin(client);
    if (result.created) {
      console.log("[folio] ------------------------------------------------------------");
      console.log("[folio] 已创建管理员账户：");
      console.log(`[folio]   邮箱    ${result.email}`);
      console.log(`[folio]   密码    ${result.password}`);
      console.log("[folio] 密码只显示这一次，请立刻保存。");
      console.log("[folio] ------------------------------------------------------------");
    } else {
      console.log(`[folio] 管理员    ${result.email}`);
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
    console.error("[folio] 管理员初始化失败:", err?.message || err);
    process.exit(1);
  });
}
