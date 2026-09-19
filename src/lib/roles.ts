import { createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

export const ROLES = ["reader", "author", "editor", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  reader: "用户",
  author: "作者",
  editor: "编辑",
  admin: "管理员",
};

const RANK: Record<Role, number> = { reader: 0, author: 1, editor: 2, admin: 3 };

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function parseRole(value: string | null | undefined): Role {
  return value && isRole(value) ? value : "reader";
}

export function roleAtLeast(role: Role, min: Role) {
  return RANK[role] >= RANK[min];
}

export async function ensureUserRole(sql: Sql, userId: string): Promise<Role> {
  const existing = await sql.query<{ role: string }>(`select role from user_roles where user_id = $1`, [userId]);
  if (existing[0] && isRole(existing[0].role)) return existing[0].role;
  const count = await sql.query<{ n: number }>(`select count(*)::int as n from user_roles`);
  const role: Role = (count[0]?.n ?? 0) === 0 ? "admin" : "reader";
  await sql`insert into user_roles (user_id, role) values (${userId}, ${role}) on conflict (user_id) do nothing`;
  const again = await sql.query<{ role: string }>(`select role from user_roles where user_id = $1`, [userId]);
  return again[0] && isRole(again[0].role) ? again[0].role : role;
}

export async function getActor(userId: string) {
  const sql = await getSql();
  const role = await ensureUserRole(sql, userId);
  return {
    userId,
    role,
    isAdmin: role === "admin",
    canWrite: roleAtLeast(role, "author"),
    canEditAll: roleAtLeast(role, "editor"),
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
