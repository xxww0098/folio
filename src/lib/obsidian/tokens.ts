import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";

export type TokenRow = {
  id: number;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export async function createUserToken(userId: string, name: string): Promise<{ token: string; item: TokenRow }> {
  const sql = await getSql();
  const secret = randomBytes(24).toString("hex");
  const token = `folio_${secret}`;
  const prefix = token.slice(0, 12);
  const inserted = await sql`
    insert into api_tokens (user_id, name, token_hash, prefix)
    values (${userId}, ${name.trim() || "Obsidian"}, ${hashToken(token)}, ${prefix})
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
  if (!token.startsWith("folio_") || token.length < 20) return null;
  const sql = await getSql();
  const hash = hashToken(token);
  const rows = await sql.query<{ id: number; user_id: string; token_hash: string }>(
    `select id, user_id, token_hash from api_tokens where token_hash = $1 limit 1`,
    [hash],
  );
  const row = rows[0];
  if (!row) return null;
  const a = Buffer.from(row.token_hash);
  const b = Buffer.from(hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  await sql`update api_tokens set last_used_at = ${new Date().toISOString()} where id = ${row.id}`;
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
