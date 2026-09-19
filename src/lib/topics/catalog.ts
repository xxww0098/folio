export const DEFAULT_TOPICS = ["TypeScript", "Rust", "Go", "Python", "SQL", "Zig", "架构"] as const;

export const MAX_TOPICS = 24;
export const TOPIC_NAME_MAX = 20;

export function parseTopics(raw: string | null | undefined): string[] {
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  const source = Array.isArray(parsed) ? parsed : DEFAULT_TOPICS;
  const seen = new Set<string>();
  const next: string[] = [];
  for (const item of source) {
    const name = normalizeTopicName(String(item ?? ""));
    if (!name || seen.has(name)) continue;
    seen.add(name);
    next.push(name);
    if (next.length >= MAX_TOPICS) break;
  }
  return next.length ? next : [...DEFAULT_TOPICS];
}

export function normalizeTopicName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, TOPIC_NAME_MAX);
}
