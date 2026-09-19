/**
 * Slow down PAT brute-force on /api/mcp and /api/obsidian.
 * In-process only; enough for a single Folio instance.
 */

const TOKEN_RE = /^folio_[A-Za-z0-9_-]{40,128}$/;

export function isFolioToken(raw: string) {
  return TOKEN_RE.test(raw.trim());
}

const WINDOW_MS = 5 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;
const MAX_KEYS = 4000;

type Bucket = { fails: number[]; lockedUntil: number };

const store = globalThis as typeof globalThis & { __folioTokenGuard__?: Map<string, Bucket> };
store.__folioTokenGuard__ ??= new Map();
const buckets = store.__folioTokenGuard__;

function now() {
  return Date.now();
}

function prune(bucket: Bucket, t: number) {
  bucket.fails = bucket.fails.filter((stamp) => t - stamp < WINDOW_MS);
  if (bucket.lockedUntil && t >= bucket.lockedUntil) bucket.lockedUntil = 0;
}

function evictIfNeeded() {
  if (buckets.size < MAX_KEYS) return;
  const t = now();
  for (const [key, bucket] of buckets) {
    prune(bucket, t);
    if (!bucket.fails.length && !bucket.lockedUntil) buckets.delete(key);
    if (buckets.size < MAX_KEYS) return;
  }
  const first = buckets.keys().next().value;
  if (first) buckets.delete(first);
}

export function clientAuthKey(request: Request, tokenHint = "") {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("cf-connecting-ip")?.trim() || request.headers.get("x-real-ip")?.trim() || "local";
  const prefix = tokenHint.replace(/^Bearer\s+/i, "").trim().slice(0, 12);
  return `${ip}|${prefix}`;
}

export function authLock(key: string): { locked: false } | { locked: true; retryAfterSec: number } {
  const t = now();
  const bucket = buckets.get(key);
  if (!bucket) return { locked: false };
  prune(bucket, t);
  if (bucket.lockedUntil > t) {
    return { locked: true, retryAfterSec: Math.max(1, Math.ceil((bucket.lockedUntil - t) / 1000)) };
  }
  return { locked: false };
}

export function noteAuthFailure(key: string) {
  const t = now();
  evictIfNeeded();
  const bucket = buckets.get(key) ?? { fails: [], lockedUntil: 0 };
  prune(bucket, t);
  bucket.fails.push(t);
  if (bucket.fails.length >= MAX_FAILS) {
    bucket.lockedUntil = t + LOCK_MS;
    bucket.fails = [];
  }
  buckets.set(key, bucket);
}

export function noteAuthSuccess(key: string) {
  buckets.delete(key);
}

export function authFailDelay() {
  const ms = 80 + Math.floor(Math.random() * 120);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function resetTokenGuard() {
  buckets.clear();
}
