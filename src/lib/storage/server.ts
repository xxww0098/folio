import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { getActor } from "@/lib/roles";
import {
  SETTING_KEY,
  loadResolvedStorage,
  parseStorageForm,
  parseStoredValue,
  pullS3BytesToPg,
  pushPgBytesToS3,
  resolveStorage,
  testObjectStorage,
} from "../../../scripts/object-storage.mjs";

const formSchema = z.object({
  driver: z.enum(["pg", "s3"]),
  endpoint: z.string().max(300),
  bucket: z.string().max(80),
  region: z.string().max(64),
  accessKey: z.string().max(128),
  secretKey: z.string().max(256).optional(),
  forcePathStyle: z.boolean(),
  publicBase: z.string().max(300),
  prefix: z.string().max(64),
});

export type StoragePublicSettings = {
  driver: "pg" | "s3";
  source: "settings" | "env" | "default";
  endpoint: string;
  bucket: string;
  region: string;
  accessKey: string;
  secretSet: boolean;
  forcePathStyle: boolean;
  publicBase: string;
  prefix: string;
  ready: boolean;
  envComplete: boolean;
  pgCount: number;
  s3Count: number;
};

async function readStored() {
  const sql = await getSql();
  const rows = await sql.query<{ value: string }>(
    `select value from site_settings where key = $1 limit 1`,
    [SETTING_KEY],
  );
  return parseStoredValue(rows[0]?.value);
}

async function writeStored(value: Record<string, unknown>) {
  const sql = await getSql();
  await sql`
    insert into site_settings (key, value, updated_at)
    values (${SETTING_KEY}, ${JSON.stringify(value)}, ${new Date().toISOString()})
    on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at
  `;
}

async function counts() {
  const sql = await getSql();
  const rows = await sql.query<{ pg_count: number; s3_count: number }>(
    `select
       count(*) filter (where data is not null)::int as pg_count,
       count(*) filter (where object_key is not null and data is null)::int as s3_count
     from attachments`,
  );
  return {
    pgCount: Number(rows[0]?.pg_count ?? 0),
    s3Count: Number(rows[0]?.s3_count ?? 0),
  };
}

async function publicSettings(): Promise<StoragePublicSettings> {
  const stored = await readStored();
  const resolved = resolveStorage(stored);
  const tally = await counts();
  return {
    driver: resolved.driver,
    source: resolved.source,
    endpoint: resolved.config.endpoint,
    bucket: resolved.config.bucket,
    region: resolved.config.region,
    accessKey: resolved.config.accessKey,
    secretSet: Boolean(resolved.config.secretKey),
    forcePathStyle: resolved.config.forcePathStyle,
    publicBase: resolved.config.publicBase,
    prefix: resolved.config.prefix,
    ready: resolved.ready,
    envComplete: resolved.envComplete,
    ...tally,
  };
}

function requireAdmin(isAdmin: boolean) {
  if (!isAdmin) throw new Error("只有管理员可以修改存储");
}

export const getStorageSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<StoragePublicSettings> => {
    const actor = await getActor(context.userId);
    if (!actor.isAdmin) {
      return {
        driver: "pg",
        source: "default",
        endpoint: "",
        bucket: "",
        region: "",
        accessKey: "",
        secretSet: false,
        forcePathStyle: true,
        publicBase: "",
        prefix: "folio",
        ready: true,
        envComplete: false,
        pgCount: 0,
        s3Count: 0,
      };
    }
    return publicSettings();
  });

export const setStorageSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(formSchema)
  .handler(async ({ context, data }): Promise<StoragePublicSettings> => {
    const actor = await getActor(context.userId);
    requireAdmin(actor.isAdmin);
    const stored = await readStored();
    const secretKey = data.secretKey?.trim() || stored?.secretKey || "";
    const parsed = parseStorageForm({ ...data, secretKey });
    if (!parsed.ok) throw new Error(parsed.error);
    await writeStored(parsed.value);
    return publicSettings();
  });

export const testStorageSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(formSchema)
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const actor = await getActor(context.userId);
    requireAdmin(actor.isAdmin);
    const stored = await readStored();
    const secretKey = data.secretKey?.trim() || stored?.secretKey || "";
    const parsed = parseStorageForm({ ...data, secretKey, driver: "s3" });
    if (!parsed.ok) throw new Error(parsed.error);
    const resolved = resolveStorage(parsed.value);
    await testObjectStorage(resolved.config);
    return { ok: true };
  });

export const migrateStorage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ direction: z.enum(["to-s3", "to-pg"]) }))
  .handler(async ({ context, data }): Promise<StoragePublicSettings & { moved: number }> => {
    const actor = await getActor(context.userId);
    requireAdmin(actor.isAdmin);
    const sql = await getSql();
    const resolved = await loadResolvedStorage((text, params) => sql.query(text, params));
    if (!resolved.config.accessKey || !resolved.config.secretKey || !resolved.config.bucket) {
      throw new Error("请先填好对象存储并保存");
    }
    const result =
      data.direction === "to-s3"
        ? await pushPgBytesToS3((text, params) => sql.query(text, params), resolved.config)
        : await pullS3BytesToPg((text, params) => sql.query(text, params), resolved.config);
    if (result.errors.length && result.moved === 0) {
      throw new Error(result.errors[0] ?? "无法迁移");
    }
    const settings = await publicSettings();
    return { ...settings, moved: result.moved };
  });
