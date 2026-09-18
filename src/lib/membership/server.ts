import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { getActor } from "@/lib/roles";
import { optionalAuthMiddleware } from "./session";
import {
  PLANS,
  canReadFull,
  clampExclusiveDays,
  isAccessMode,
  isExclusiveNow,
  isPlanId,
  previewBody,
  resolvePublicAt,
  type AccessGate,
  type AccessMode,
  type PlanId,
} from "./access";

export type { AccessGate, AccessMode };

type SubRow = {
  user_id: string;
  plan: string;
  status: string;
  source: string;
  starts_at: string;
  expires_at: string | null;
};

export type Membership = {
  signedIn: boolean;
  isPaid: boolean;
  plan: PlanId | null;
  planLabel: string | null;
  source: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  remainingDays: number | null;
};

export type SubscriberRow = {
  userId: string;
  name: string;
  email: string | null;
  plan: PlanId;
  status: string;
  source: string;
  expiresAt: string | null;
};

export type RedeemCodeRow = {
  id: number;
  code: string;
  plan: PlanId;
  days: number;
  maxUses: number;
  usedCount: number;
  note: string;
  createdAt: string;
};

function asIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function isActive(row: SubRow | undefined, now = Date.now()) {
  if (!row || row.status !== "active") return false;
  if (!row.expires_at) return true;
  return new Date(row.expires_at).getTime() > now;
}

function planLabel(plan: string | null) {
  if (plan === "monthly") return "月卡";
  if (plan === "yearly") return "年卡";
  if (plan === "comp") return "赠送";
  return null;
}

function remainingDays(expiresAt: string | null, now = Date.now()) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

async function readSubscription(userId: string): Promise<SubRow | undefined> {
  const sql = await getSql();
  const rows = await sql.query<SubRow>(
    `select user_id, plan, status, source, starts_at, expires_at from subscriptions where user_id = $1 limit 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return undefined;
  return {
    ...row,
    starts_at: asIso(row.starts_at) ?? new Date().toISOString(),
    expires_at: asIso(row.expires_at),
  };
}

async function isEditorOrAdmin(userId: string) {
  const sql = await getSql();
  const rows = await sql.query<{ role: string }>(`select role from user_roles where user_id = $1`, [userId]);
  return rows[0]?.role === "admin" || rows[0]?.role === "editor";
}

export async function getViewerFlags(userId: string | null) {
  if (!userId) {
    return { userId: null, isPaid: false, isStaff: false, membership: emptyMembership(false) };
  }
  const [sub, isStaff] = await Promise.all([readSubscription(userId), isEditorOrAdmin(userId)]);
  const paid = isActive(sub);
  return {
    userId,
    isPaid: paid,
    isStaff,
    membership: toMembership(true, paid ? sub : undefined),
  };
}

function emptyMembership(signedIn: boolean): Membership {
  return {
    signedIn,
    isPaid: false,
    plan: null,
    planLabel: null,
    source: null,
    startsAt: null,
    expiresAt: null,
    remainingDays: null,
  };
}

function toMembership(signedIn: boolean, row: SubRow | undefined): Membership {
  if (!row || !isActive(row)) return emptyMembership(signedIn);
  return {
    signedIn,
    isPaid: true,
    plan: isPlanId(row.plan) ? row.plan : "comp",
    planLabel: planLabel(row.plan),
    source: row.source,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    remainingDays: remainingDays(row.expires_at),
  };
}

export function buildAccessGate(input: {
  mode: AccessMode;
  exclusiveDays: number;
  publishedAt: string | null;
  isPaid: boolean;
  isStaff: boolean;
  signedIn: boolean;
}): AccessGate {
  const exclusive = isExclusiveNow(input.mode, input.publishedAt, input.exclusiveDays);
  const locked = !canReadFull(input);
  return {
    mode: input.mode,
    exclusiveDays: clampExclusiveDays(input.exclusiveDays),
    publicAt: resolvePublicAt(input.mode, input.publishedAt, input.exclusiveDays),
    exclusive,
    locked,
    isPaid: input.isPaid,
    isStaff: input.isStaff,
    reason: locked ? (input.signedIn ? "subscribe" : "login") : "none",
  };
}

export function applyBodyGate(body: string, gate: AccessGate) {
  if (!gate.locked) return body;
  return previewBody(body);
}

export function listAccessFromRow(row: {
  access_mode?: string | null;
  exclusive_days?: number | null;
  published_at: string | null;
}) {
  const mode: AccessMode = isAccessMode(row.access_mode) ? row.access_mode : "public";
  const exclusiveDays = clampExclusiveDays(row.exclusive_days);
  return {
    accessMode: mode,
    exclusiveDays,
    publicAt: resolvePublicAt(mode, row.published_at, exclusiveDays),
    exclusive: isExclusiveNow(mode, row.published_at, exclusiveDays),
  };
}

async function writeSubscription(input: {
  userId: string;
  plan: PlanId;
  days: number | null;
  source: string;
}) {
  const sql = await getSql();
  const existing = await readSubscription(input.userId);
  const now = Date.now();
  const base =
    existing && isActive(existing, now) && existing.expires_at
      ? new Date(existing.expires_at).getTime()
      : now;
  const expiresAt = input.days == null ? null : new Date(base + input.days * 86_400_000).toISOString();
  const startsAt = asIso(existing?.starts_at) ?? new Date(now).toISOString();
  await sql`
    insert into subscriptions (user_id, plan, status, source, starts_at, expires_at, updated_at)
    values (${input.userId}, ${input.plan}, ${"active"}, ${input.source}, ${startsAt}, ${expiresAt}, ${new Date().toISOString()})
    on conflict (user_id) do update set
      plan = excluded.plan,
      status = ${"active"},
      source = excluded.source,
      expires_at = excluded.expires_at,
      updated_at = excluded.updated_at
  `;
}

async function ensureDemoCode() {
  const sql = await getSql();
  const found = await sql.query<{ id: number }>(`select id from redeem_codes where code = $1 limit 1`, [
    "FOLIO-TECH",
  ]);
  if (found[0]) return;
  await sql`
    insert into redeem_codes (code, plan, days, max_uses, note, created_by)
    values (${"FOLIO-TECH"}, ${"yearly"}, ${365}, ${200}, ${"演示兑换码，开通一年会员"}, ${"folio-desk"})
    on conflict (code) do nothing
  `;
}

export const getMyMembership = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .handler(async ({ context }): Promise<Membership> => {
    await ensureDemoCode();
    const flags = await getViewerFlags(context.userId);
    return flags.membership;
  });

export const startSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ plan: z.enum(["monthly", "yearly"]) }))
  .handler(async ({ context, data }): Promise<Membership> => {
    const plan = PLANS.find((item) => item.id === data.plan);
    if (!plan) throw new Error("未知方案");
    await writeSubscription({
      userId: context.userId,
      plan: plan.id,
      days: plan.days,
      source: "checkout",
    });
    const flags = await getViewerFlags(context.userId);
    return flags.membership;
  });

export const redeemCode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ code: z.string().trim().min(4).max(32) }))
  .handler(async ({ context, data }): Promise<Membership> => {
    await ensureDemoCode();
    const sql = await getSql();
    const code = data.code.trim().toUpperCase();
    const rows = await sql.query<{
      id: number;
      plan: string;
      days: number;
      max_uses: number;
      used_count: number;
    }>(`select id, plan, days, max_uses, used_count from redeem_codes where code = $1 limit 1`, [code]);
    const row = rows[0];
    if (!row) throw new Error("兑换码无效");
    if (row.used_count >= row.max_uses) throw new Error("兑换码已用完");
    const used = await sql.query<{ id: number }>(
      `select id from redeem_code_uses where code_id = $1 and user_id = $2 limit 1`,
      [row.id, context.userId],
    );
    if (used[0]) throw new Error("你已经使用过这个兑换码");
    const plan: PlanId = isPlanId(row.plan) ? row.plan : "yearly";
    await writeSubscription({
      userId: context.userId,
      plan,
      days: row.days,
      source: "code",
    });
    await sql`insert into redeem_code_uses (code_id, user_id) values (${row.id}, ${context.userId})`;
    await sql`update redeem_codes set used_count = used_count + 1 where id = ${row.id}`;
    const flags = await getViewerFlags(context.userId);
    return flags.membership;
  });

export const grantSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      userId: z.string().min(1),
      days: z.number().int().min(1).max(3650).optional(),
    }),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) throw new Error("没有权限");
    await writeSubscription({
      userId: data.userId,
      plan: "comp",
      days: data.days ?? 365,
      source: "admin",
    });
    return { ok: true };
  });

export const revokeSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) throw new Error("没有权限");
    const sql = await getSql();
    await sql`
      update subscriptions set status = ${"canceled"}, updated_at = ${new Date().toISOString()}
      where user_id = ${data.userId}
    `;
    return { ok: true };
  });

export const createRedeemCode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      days: z.number().int().min(1).max(3650).optional(),
      maxUses: z.number().int().min(1).max(999).optional(),
      note: z.string().trim().max(40).optional(),
    }),
  )
  .handler(async ({ context, data }): Promise<{ code: string }> => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) throw new Error("没有权限");
    const sql = await getSql();
    const code = `FOLIO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await sql`
      insert into redeem_codes (code, plan, days, max_uses, note, created_by)
      values (
        ${code},
        ${"yearly"},
        ${data.days ?? 365},
        ${data.maxUses ?? 5},
        ${data.note ?? ""},
        ${context.userId}
      )
    `;
    return { code };
  });

export const listMembershipAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ subscribers: SubscriberRow[]; codes: RedeemCodeRow[] }> => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) return { subscribers: [], codes: [] };
    await ensureDemoCode();
    const sql = await getSql();
    const subs = await sql.query<{
      user_id: string;
      plan: string;
      status: string;
      source: string;
      expires_at: string | null;
      name: string | null;
      email: string | null;
    }>(
      `select s.user_id, s.plan, s.status, s.source, s.expires_at, u.name, u.email
       from subscriptions s
       left join "user" u on u.id = s.user_id
       order by s.updated_at desc`,
    );
    const codes = await sql.query<{
      id: number;
      code: string;
      plan: string;
      days: number;
      max_uses: number;
      used_count: number;
      note: string;
      created_at: string;
    }>(`select id, code, plan, days, max_uses, used_count, note, created_at from redeem_codes order by created_at desc`);
    return {
      subscribers: subs.map((row) => ({
        userId: row.user_id,
        name: row.name?.trim() || row.email?.split("@")[0] || "读者",
        email: row.email,
        plan: isPlanId(row.plan) ? row.plan : "comp",
        status: isActive({
          user_id: row.user_id,
          plan: row.plan,
          status: row.status,
          source: row.source,
          starts_at: new Date().toISOString(),
          expires_at: asIso(row.expires_at),
        })
          ? "active"
          : row.status,
        source: row.source,
        expiresAt: asIso(row.expires_at),
      })),
      codes: codes.map((row) => ({
        id: row.id,
        code: row.code,
        plan: isPlanId(row.plan) ? row.plan : "yearly",
        days: Number(row.days),
        maxUses: Number(row.max_uses),
        usedCount: Number(row.used_count),
        note: row.note,
        createdAt: asIso(row.created_at) ?? new Date().toISOString(),
      })),
    };
  });

