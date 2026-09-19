import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import { isFolioToken } from "./token-guard";

export type TokenRow = {
  id: number;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

const DUMMY_HASH = "v2:" + "0".repeat(64);
const LAST_USED_GAP_MS = 5 * 60 * 1000;

function tokenPepper() {
  const pepper = process.env.FOLIO_TOKEN_PEPPER?.trim() || process.env.BETTER_AUTH_SECRET?.trim();
  return pepper && pepper.length >= 8 ? pepper : "folio-pat-hmac-v2";
}

function hashV1(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

function hashV2(raw: string) {
  return `v2:${createHmac("sha256", tokenPepper()).update(raw).digest("hex")}`;
}

export async function createUserToken(userId: string, name: string): Promise<{ token: string; item: TokenRow }> {
  const sql = await getSql();
  const secret = randomBytes(32).toString("base64url");
  const token = `folio_${secret}`;
  const prefix = token.slice(0, 12);
  const inserted = await sql`
    insert into api_tokens (user_id, name, token_hash, prefix)
    values (${userId}, ${name.trim() || "Obsidian"}, ${hashV2(token)}, ${prefix})
    returning id, name, prefix, last_used_at, created_at
  `;
  const row = inserted[0] as {
    id: number;
    name: string;
    prefix: string;
    last_used_at: string | null;
    created_at: string;
  };
  return { token, item: toRow(row) };
}

export async function listUserTokens(userId: string): Promise<TokenRow[]> {
  const sql = await getSql();
  const rows = await sql.query<{
    id: number;
    name: string;
    prefix: string;
    last_used_at: string | null;
    created_at: string;
  }>(
    `select id, name, prefix, last_used_at, created_at from api_tokens where user_id = $1 order by created_at desc`,
    [userId],
  );
  return rows.map(toRow);
}

export async function revokeUserToken(userId: string, id: number) {
  const sql = await getSql();
  await sql`delete from api_tokens where id = ${id} and user_id = ${userId}`;
}

export async function userIdFromToken(raw: string): Promise<string | null> {
  const token = raw.trim();
  if (!isFolioToken(token)) return null;
  const sql = await getSql();
  const v2 = hashV2(token);
  const v1 = hashV1(token);
  const rows = await sql.query<{ id: number; user_id: string; token_hash: string; last_used_at: string | null }>(
    `select id, user_id, token_hash, last_used_at from api_tokens where token_hash = $1 or token_hash = $2 limit 1`,
    [v2, v1],
  );
  const row = rows[0];
  const expected = row?.token_hash ?? DUMMY_HASH;
  const presented = expected.startsWith("v2:") ? v2 : v1;
  const a = Buffer.from(expected);
  const b = Buffer.from(presented);
  if (!row || a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const last = row.last_used_at ? new Date(row.last_used_at).getTime() : 0;
  if (!Number.isFinite(last) || Date.now() - last > LAST_USED_GAP_MS) {
    await sql`update api_tokens set last_used_at = ${new Date().toISOString()} where id = ${row.id}`;
  }
  return row.user_id;
}

function toRow(row: {
  id: number;
  name: string;
  prefix: string;
  last_used_at: string | null;
  created_at: string;
}): TokenRow {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    lastUsedAt: row.last_used_at ? String(row.last_used_at) : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date(row.created_at).toISOString(),
  };
}
