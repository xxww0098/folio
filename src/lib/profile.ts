import type { Sql } from "@/lib/db";

export async function displayNameFor(sql: Sql, userId: string, fallback: string) {
  const rows = await sql.query<{ name: string | null; email: string | null }>(
    `select name, email from "user" where id = $1`,
    [userId],
  );
  const row = rows[0];
  const name = row?.name?.trim();
  if (name) return name;
  const emailName = row?.email?.split("@")[0]?.trim();
  if (emailName) return emailName;
  return fallback;
}
