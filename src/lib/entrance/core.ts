/** HttpOnly cookie that proves the visitor opened the backend entrance path. */
export const ENTRANCE_COOKIE = "folio_entrance";

/** Same alphabet and length as a typical panel security path. */
export const ENTRANCE_PATTERN = /^[a-zA-Z0-9]{5,116}$/;

/**
 * Top-level segments that already belong to the public site or the backend.
 * A colliding entrance would never be reachable because the static route wins.
 */
export const RESERVED_ENTRANCES = new Set([
  "about",
  "api",
  "archive",
  "assets",
  "categories",
  "console",
  "covers",
  "favicon",
  "links",
  "login",
  "mcp",
  "me",
  "membership",
  "moments",
  "obsidian",
  "photos",
  "posts",
  "static",
  "tags",
  "themes",
  "topics",
  "write",
]);

export type EntranceParse =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function encodeEntrance(value: string) {
  return btoa(value);
}

export function sameSecret(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function cookieMatchesEntrance(cookie: string | undefined, entrance: string) {
  if (!cookie || !entrance) return false;
  return sameSecret(cookie, encodeEntrance(entrance));
}

export function reservedEntrance(value: string) {
  return RESERVED_ENTRANCES.has(value.toLowerCase());
}

export function parseEntrance(raw: string): EntranceParse {
  const value = raw.trim();
  if (!value) return { ok: true, value: "" };
  if (!ENTRANCE_PATTERN.test(value)) {
    return { ok: false, error: "入口须为 5–116 位字母或数字" };
  }
  if (reservedEntrance(value)) {
    return { ok: false, error: "这段路径已被站点占用" };
  }
  return { ok: true, value };
}

export function entranceFromBytes(bytes: Uint8Array) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (const byte of bytes) {
    out += alphabet[byte % alphabet.length];
  }
  return out;
}

export function generateEntrance(length = 10) {
  const size = Math.min(116, Math.max(5, length));
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    const value = entranceFromBytes(bytes);
    if (!reservedEntrance(value)) return value;
  }
  return `x${entranceFromBytes(crypto.getRandomValues(new Uint8Array(size - 1)))}`;
}
