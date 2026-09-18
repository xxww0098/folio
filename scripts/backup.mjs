#!/usr/bin/env node
/**
 * Folio site snapshot. Same JSON for the console and Docker CLI.
 *
 * Covers owner account, posts, attachments (bytea as base64), settings.
 * Skips live sessions so a restore is not tied to the current signing secret.
 */
// @ts-check

export const SNAPSHOT_KIND = "folio-snapshot";
export const SNAPSHOT_VERSION = 1;

/**
 * @typedef {{
 *   name: string,
 *   columns: string[],
 *   orderBy: string[],
 *   serial?: string,
 *   bytea?: string[],
 * }} SnapshotTable
 */

/** Insert order (parents first). Truncate uses the reverse. */
export const SNAPSHOT_TABLES = /** @type {SnapshotTable[]} */ ([
  {
    name: "user",
    columns: ["id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt"],
    orderBy: ["id"],
  },
  {
    name: "account",
    columns: [
      "id",
      "accountId",
      "providerId",
      "userId",
      "accessToken",
      "refreshToken",
      "idToken",
      "accessTokenExpiresAt",
      "refreshTokenExpiresAt",
      "scope",
      "password",
      "createdAt",
      "updatedAt",
    ],
    orderBy: ["id"],
  },
  {
    name: "user_roles",
    columns: ["user_id", "role", "created_at"],
    orderBy: ["user_id"],
  },
  {
    name: "site_settings",
    columns: ["key", "value", "updated_at"],
    orderBy: ["key"],
  },
  {
    name: "posts",
    columns: [
      "id",
      "user_id",
      "author_name",
      "slug",
      "title",
      "excerpt",
      "body",
      "cover_image",
      "cover_alt",
      "topic",
      "status",
      "reading_minutes",
      "featured",
      "published_at",
      "created_at",
      "updated_at",
      "view_count",
      "allow_comments",
      "deleted_at",
      "access_mode",
      "exclusive_days",
    ],
    orderBy: ["id"],
    serial: "id",
  },
  {
    name: "tags",
    columns: ["id", "name", "slug"],
    orderBy: ["id"],
    serial: "id",
  },
  {
    name: "post_tags",
    columns: ["post_id", "tag_id"],
    orderBy: ["post_id", "tag_id"],
  },
  {
    name: "comments",
    columns: ["id", "post_id", "user_id", "author_name", "body", "created_at", "parent_id"],
    orderBy: ["id"],
    serial: "id",
  },
  {
    name: "post_likes",
    columns: ["post_id", "user_id", "created_at"],
    orderBy: ["post_id", "user_id"],
  },
  {
    name: "post_revisions",
    columns: ["id", "post_id", "title", "excerpt", "body", "editor_id", "editor_name", "created_at"],
    orderBy: ["id"],
    serial: "id",
  },
  {
    name: "moments",
    columns: ["id", "user_id", "author_name", "body", "created_at"],
    orderBy: ["id"],
    serial: "id",
  },
  {
    name: "friend_links",
    columns: ["id", "name", "url", "description", "group_name", "sort_order"],
    orderBy: ["id"],
    serial: "id",
  },
  {
    name: "photos",
    columns: ["id", "title", "description", "image", "group_name", "taken_at"],
    orderBy: ["id"],
    serial: "id",
  },
  {
    name: "attachments",
    columns: [
      "id",
      "user_id",
      "filename",
      "mime_type",
      "size_bytes",
      "url",
      "alt",
      "group_name",
      "data",
      "object_key",
      "created_at",
    ],
    orderBy: ["id"],
    serial: "id",
    bytea: ["data"],
  },
  {
    name: "api_tokens",
    columns: ["id", "user_id", "name", "token_hash", "prefix", "last_used_at", "created_at"],
    orderBy: ["id"],
    serial: "id",
  },
  {
    name: "subscriptions",
    columns: [
      "id",
      "user_id",
      "plan",
      "status",
      "source",
      "starts_at",
      "expires_at",
      "created_at",
      "updated_at",
    ],
    orderBy: ["id"],
    serial: "id",
  },
  {
    name: "redeem_codes",
    columns: ["id", "code", "plan", "days", "max_uses", "used_count", "note", "created_by", "created_at"],
    orderBy: ["id"],
    serial: "id",
  },
  {
    name: "redeem_code_uses",
    columns: ["id", "code_id", "user_id", "used_at"],
    orderBy: ["id"],
    serial: "id",
  },
]);

/** @param {string} name */
export function quoteIdent(name) {
  return `"${String(name).replaceAll('"', '""')}"`;
}

/** @param {unknown} value */
export function encodeCell(value) {
  if (value == null) return null;
  if (Buffer.isBuffer(value)) {
    return { $folio: "bytea", data: value.toString("base64") };
  }
  if (value instanceof Uint8Array) {
    return { $folio: "bytea", data: Buffer.from(value).toString("base64") };
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return Number(value);
  return value;
}

/** @param {unknown} value */
export function decodeCell(value) {
  if (value == null) return null;
  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    "$folio" in value &&
    value.$folio === "bytea"
  ) {
    const data = "data" in value ? String(value.data ?? "") : "";
    return Buffer.from(data, "base64");
  }
  return value;
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, snapshot: object } | { ok: false, error: string }}
 */
export function parseSnapshot(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "不是折页备份文件" };
  }
  const data = /** @type {Record<string, unknown>} */ (raw);
  if (data.kind !== SNAPSHOT_KIND) return { ok: false, error: "不是折页备份文件" };
  if (data.version !== SNAPSHOT_VERSION) {
    return { ok: false, error: "备份版本不匹配，请先把折页升到能读这份文件的版本" };
  }
  if (!data.tables || typeof data.tables !== "object" || Array.isArray(data.tables)) {
    return { ok: false, error: "备份里没有表数据" };
  }
  return { ok: true, snapshot: data };
}

/**
 * @param {Record<string, unknown>} snapshot
 */
export function summarizeSnapshot(snapshot) {
  const tables = /** @type {Record<string, unknown>} */ (snapshot.tables ?? {});
  /** @type {Record<string, number>} */
  const counts = {};
  for (const table of SNAPSHOT_TABLES) {
    const rows = tables[table.name];
    counts[table.name] = Array.isArray(rows) ? rows.length : 0;
  }
  return {
    exportedAt: typeof snapshot.exportedAt === "string" ? snapshot.exportedAt : "",
    appVersion: typeof snapshot.appVersion === "string" ? snapshot.appVersion : "",
    counts,
  };
}

/**
 * @param {(text: string, params?: unknown[]) => Promise<Array<Record<string, unknown>>>} query
 * @param {{ appVersion?: string }} [meta]
 */
export async function collectSnapshot(query, meta = {}) {
  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const tables = {};
  for (const table of SNAPSHOT_TABLES) {
    const cols = table.columns.map(quoteIdent).join(", ");
    const order = table.orderBy.map(quoteIdent).join(", ");
    const rows = await query(`select ${cols} from ${quoteIdent(table.name)} order by ${order}`);
    tables[table.name] = rows.map((row) => {
      /** @type {Record<string, unknown>} */
      const out = {};
      for (const column of table.columns) out[column] = encodeCell(row[column]);
      return out;
    });
  }
  return {
    kind: SNAPSHOT_KIND,
    version: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: meta.appVersion ?? process.env.VITE_FOLIO_VERSION ?? "",
    tables,
  };
}

/**
 * @param {(text: string, params?: unknown[]) => Promise<Array<Record<string, unknown>>>} query
 * @param {unknown} raw
 */
export async function applySnapshot(query, raw) {
  const parsed = parseSnapshot(raw);
  if (!parsed.ok) throw new Error(parsed.error);
  const snapshot = /** @type {{ tables: Record<string, unknown> }} */ (parsed.snapshot);
  const names = [...SNAPSHOT_TABLES].reverse().map((table) => quoteIdent(table.name)).join(", ");
  await query(`truncate table ${names} restart identity cascade`);

  /** @type {Record<string, number>} */
  const counts = {};
  for (const table of SNAPSHOT_TABLES) {
    const rows = Array.isArray(snapshot.tables[table.name])
      ? /** @type {Array<Record<string, unknown>>} */ (snapshot.tables[table.name])
      : [];
    const cols = table.columns.map(quoteIdent).join(", ");
    const placeholders = table.columns.map((_, i) => `$${i + 1}`).join(", ");
    for (const row of rows) {
      const values = table.columns.map((column) => {
        const value = decodeCell(row[column]);
        return value === undefined ? null : value;
      });
      await query(`insert into ${quoteIdent(table.name)} (${cols}) values (${placeholders})`, values);
    }
    if (table.serial) await resetSerial(query, table);
    counts[table.name] = rows.length;
  }
  return { counts };
}

/**
 * @param {(text: string, params?: unknown[]) => Promise<Array<Record<string, unknown>>>} query
 * @param {SnapshotTable} table
 */
async function resetSerial(query, table) {
  const column = table.serial;
  if (!column) return;
  const maxRows = await query(
    `select coalesce(max(${quoteIdent(column)}), 0)::int as n from ${quoteIdent(table.name)}`,
  );
  const n = Number(maxRows[0]?.n ?? 0);
  if (n <= 0) return;
  const seqRows = await query(`select pg_get_serial_sequence($1, $2) as seq`, [table.name, column]);
  const seq = seqRows[0]?.seq;
  if (!seq) return;
  await query(`select setval($1::regclass, $2, true)`, [seq, n]);
}

/** @param {unknown} data */
function attachmentHasBytes(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const row = /** @type {{ $folio?: unknown, data?: unknown }} */ (data);
  return row.$folio === "bytea" && Boolean(row.data);
}

/**
 * Fill attachment bytes from object storage so a snapshot can restore onto Postgres.
 *
 * @param {Record<string, unknown>} snapshot
 * @param {(key: string) => Promise<Buffer | Uint8Array | null | undefined>} getBytes
 */
export async function hydrateAttachmentBytes(snapshot, getBytes) {
  const tables = /** @type {Record<string, unknown>} */ (snapshot.tables ?? {});
  const rows = tables.attachments;
  if (!Array.isArray(rows)) return { filled: 0 };
  let filled = 0;
  for (const item of rows) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = /** @type {Record<string, unknown>} */ (item);
    const key = typeof row.object_key === "string" ? row.object_key : "";
    if (!key || attachmentHasBytes(row.data)) continue;
    const bytes = await getBytes(key);
    if (!bytes || !bytes.length) continue;
    row.data = encodeCell(bytes);
    filled += 1;
  }
  return { filled };
}

/**
 * @param {Record<string, unknown>} snapshot
 */
export function snapshotStorageSettings(snapshot) {
  const tables = /** @type {Record<string, unknown>} */ (snapshot.tables ?? {});
  const rows = tables.site_settings;
  if (!Array.isArray(rows)) return null;
  for (const item of rows) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = /** @type {Record<string, unknown>} */ (item);
    if (row.key === "object_storage") return row.value ?? null;
  }
  return null;
}

