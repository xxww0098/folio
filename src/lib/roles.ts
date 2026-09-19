import { createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

export const ROLES = ["reader", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  reader: "用户",
  admin: "管理员",
};

export function isRole(value: string): value is Role {
  return value === "reader" || value === "admin";
}

export function parseRole(value: string | null | undefined): Role {
  return value === "admin" ? "admin" : "reader";
}

export async function ensureUserRole(sql: Sql, userId: string): Promise<Role> {
  const existing = await sql.query<{ role: string }>(`select role from user_roles where user_id = $1`, [userId]);
  if (existing[0]) {
    const role = parseRole(existing[0].role);
    if (existing[0].role !== role) {
      await sql`update user_roles set role = ${role} where user_id = ${userId}`;
    }
    return role;
  }
  const count = await sql.query<{ n: number }>(`select count(*)::int as n from user_roles`);
  const role: Role = (count[0]?.n ?? 0) === 0 ? "admin" : "reader";
  await sql`insert into user_roles (user_id, role) values (${userId}, ${role}) on conflict (user_id) do nothing`;
  const again = await sql.query<{ role: string }>(`select role from user_roles where user_id = $1`, [userId]);
  return again[0] ? parseRole(again[0].role) : role;
}

export async function getActor(userId: string) {
  const sql = await getSql();
  const role = await ensureUserRole(sql, userId);
  const isAdmin = role === "admin";
  return {
    userId,
    role,
    isAdmin,
    canWrite: isAdmin,
    canEditAll: isAdmin,
  };
}

export const claimAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const actor = await getActor(context.userId);
    return { role: actor.role, canWrite: actor.canWrite };
  });

export type MemberRow = {
  id: string;
  name: string;
  email: string | null;
  role: Role;
};
