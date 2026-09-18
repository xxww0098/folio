export const ACCESS_MODES = ["public", "early", "paid"] as const;
export type AccessMode = (typeof ACCESS_MODES)[number];

export const ACCESS_LABEL: Record<AccessMode, string> = {
  public: "公开",
  early: "会员抢先",
  paid: "会员专享",
};

export const EXCLUSIVE_DAY_OPTIONS = [3, 7, 14, 30] as const;

export const PLANS = [
  {
    id: "monthly" as const,
    label: "月卡",
    days: 30,
    price: 29,
    blurb: "立刻阅读抢先文章，期间不限次数。",
  },
  {
    id: "yearly" as const,
    label: "年卡",
    days: 365,
    price: 199,
    blurb: "全年抢先看，相当于每月 16 元。",
  },
];

export type PlanId = (typeof PLANS)[number]["id"] | "comp";

export function isAccessMode(value: string | null | undefined): value is AccessMode {
  return (ACCESS_MODES as readonly string[]).includes(value ?? "");
}

export function isPlanId(value: string | null | undefined): value is PlanId {
  return value === "monthly" || value === "yearly" || value === "comp";
}

export function clampExclusiveDays(value: number | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 7;
  return Math.max(1, Math.min(365, Math.round(n)));
}

export function resolvePublicAt(
  mode: AccessMode,
  publishedAt: string | null,
  exclusiveDays: number,
): string | null {
  if (mode === "public") return publishedAt;
  if (mode === "paid") return null;
  if (!publishedAt) return null;
  const days = clampExclusiveDays(exclusiveDays);
  return new Date(new Date(publishedAt).getTime() + days * 86_400_000).toISOString();
}

/** True while the post is still reserved for paid members. */
export function isExclusiveNow(
  mode: AccessMode,
  publishedAt: string | null,
  exclusiveDays: number,
  now = Date.now(),
) {
  if (mode === "public") return false;
  if (mode === "paid") return true;
  const publicAt = resolvePublicAt(mode, publishedAt, exclusiveDays);
  if (!publicAt) return true;
  return now < new Date(publicAt).getTime();
}

export function canReadFull(input: {
  mode: AccessMode;
  publishedAt: string | null;
  exclusiveDays: number;
  isPaid: boolean;
  isStaff: boolean;
  now?: number;
}) {
  if (input.isStaff || input.isPaid) return true;
  return !isExclusiveNow(input.mode, input.publishedAt, input.exclusiveDays, input.now);
}

const CUT = /<!--\s*(more|members|paywall)\s*-->/i;

function splitPreviewBlocks(body: string): string[] {
  const text = body.replace(/\r\n/g, "\n").trim();
  const parts: string[] = [];
  const fence = /```[\s\S]*?```/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(text))) {
    const before = text.slice(last, match.index).trim();
    if (before) parts.push(...before.split(/\n{2,}/).filter(Boolean));
    parts.push(match[0]);
    last = match.index + match[0].length;
  }
  const rest = text.slice(last).trim();
  if (rest) parts.push(...rest.split(/\n{2,}/).filter(Boolean));
  return parts;
}

export function previewBody(body: string, maxChars = 560): string {
  const cut = body.search(CUT);
  if (cut >= 0) return body.slice(0, cut).trim();
  const blocks = splitPreviewBlocks(body);
  let out = "";
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("```") || trimmed.startsWith("#")) {
      if (out) break;
      continue;
    }
    if (out.length + trimmed.length > maxChars && out.length >= 160) break;
    out += (out ? "\n\n" : "") + trimmed;
    if (out.length >= 280) break;
  }
  return out || body.slice(0, maxChars).trim();
}

export type AccessGate = {
  mode: AccessMode;
  exclusiveDays: number;
  publicAt: string | null;
  exclusive: boolean;
  locked: boolean;
  isPaid: boolean;
  isStaff: boolean;
  reason: "none" | "login" | "subscribe";
};

export function describeUnlock(publicAt: string | null, now = Date.now()): string {
  if (!publicAt) return "订阅后可随时阅读";
  const ms = new Date(publicAt).getTime() - now;
  if (ms <= 0) return "已对所有人开放";
  const hour = 3_600_000;
  const day = 24 * hour;
  if (ms < day) {
    const hours = Math.max(1, Math.ceil(ms / hour));
    return `${hours} 小时后公开`;
  }
  const days = Math.ceil(ms / day);
  return `${days} 天后公开`;
}
