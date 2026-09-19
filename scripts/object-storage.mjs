/**
 * Optional S3-compatible object storage for attachments.
 * Default remains Postgres bytea. Same helpers for the console and Docker CLI.
 */
// @ts-check

export const SETTING_KEY = "object_storage";

/**
 * @typedef {"pg" | "s3"} StorageDriver
 * @typedef {{
 *   endpoint: string,
 *   bucket: string,
 *   region: string,
 *   accessKey: string,
 *   secretKey: string,
 *   publicBase: string,
 *   prefix: string,
 *   forcePathStyle: boolean,
 * }} ObjectStorageConfig
 * @typedef {{
 *   driver?: StorageDriver,
 *   endpoint?: string,
 *   bucket?: string,
 *   region?: string,
 *   accessKey?: string,
 *   secretKey?: string,
 *   publicBase?: string,
 *   prefix?: string,
 *   forcePathStyle?: boolean,
 * }} StoredStorage
 * @typedef {{
 *   driver: StorageDriver,
 *   ready: boolean,
 *   source: "settings" | "env" | "default",
 *   envComplete: boolean,
 *   config: ObjectStorageConfig,
 * }} ResolvedStorage
 */

/** @param {string} endpoint */
export function defaultForcePathStyle(endpoint) {
  try {
    const host = new URL(endpoint).hostname;
    if (host.endsWith(".amazonaws.com")) return false;
    if (host.includes("aliyuncs.com")) return false;
    return true;
  } catch {
    return true;
  }
}

/** @param {string} value */
function trimSlash(value) {
  return String(value ?? "").trim().replace(/\/+$/, "");
}

/** @param {unknown} raw */
export function parseStoredValue(raw) {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) return /** @type {StoredStorage} */ (raw);
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    return /** @type {StoredStorage} */ (data);
  } catch {
    return null;
  }
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function configFromEnv(env = process.env) {
  const endpoint = trimSlash(env.FOLIO_S3_ENDPOINT ?? "");
  const bucket = String(env.FOLIO_S3_BUCKET ?? "").trim();
  const region = String(env.FOLIO_S3_REGION ?? "").trim();
  const accessKey = String(env.FOLIO_S3_ACCESS_KEY ?? env.AWS_ACCESS_KEY_ID ?? "").trim();
  const secretKey = String(env.FOLIO_S3_SECRET_KEY ?? env.AWS_SECRET_ACCESS_KEY ?? "").trim();
  const publicBase = trimSlash(env.FOLIO_S3_PUBLIC_URL ?? "");
  const prefix = String(env.FOLIO_S3_PREFIX ?? "").trim().replace(/^\/+|\/+$/g, "");
  const fpsRaw = String(env.FOLIO_S3_FORCE_PATH_STYLE ?? "").trim().toLowerCase();
  /** @type {boolean | undefined} */
  let forcePathStyle;
  if (fpsRaw === "true" || fpsRaw === "1") forcePathStyle = true;
  else if (fpsRaw === "false" || fpsRaw === "0") forcePathStyle = false;
  return {
    endpoint,
    bucket,
    region,
    accessKey,
    secretKey,
    publicBase,
    prefix,
    forcePathStyle,
    complete: Boolean(endpoint && bucket && accessKey && secretKey),
  };
}

/**
 * @param {StoredStorage | null | undefined} stored
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {ResolvedStorage}
 */
export function resolveStorage(stored, env = process.env) {
  const fromEnv = configFromEnv(env);
  const hasStored = Boolean(stored && typeof stored === "object");
  /** @type {StorageDriver | null} */
  const storedDriver =
    stored?.driver === "s3" || stored?.driver === "pg" ? stored.driver : null;
  const driver = storedDriver ?? (fromEnv.complete ? "s3" : "pg");

  /** @param {keyof ObjectStorageConfig} key */
  const pick = (key) => {
    const fromStored = hasStored ? String(stored?.[key] ?? "").trim() : "";
    if (fromStored) return fromStored;
    return String(fromEnv[key] ?? "").trim();
  };

  const endpoint = trimSlash(pick("endpoint"));
  /** @type {boolean} */
  let forcePathStyle;
  if (hasStored && typeof stored?.forcePathStyle === "boolean") {
    forcePathStyle = stored.forcePathStyle;
  } else if (typeof fromEnv.forcePathStyle === "boolean") {
    forcePathStyle = fromEnv.forcePathStyle;
  } else {
    forcePathStyle = defaultForcePathStyle(endpoint);
  }

  const prefixRaw = pick("prefix") || fromEnv.prefix;
  const config = {
    endpoint,
    bucket: pick("bucket"),
    region: pick("region") || (endpoint ? "auto" : "us-east-1"),
    accessKey: pick("accessKey"),
    secretKey: hasStored && String(stored?.secretKey ?? "").trim()
      ? String(stored?.secretKey).trim()
      : fromEnv.secretKey,
    publicBase: trimSlash(pick("publicBase")),
    prefix: String(prefixRaw || "folio").replace(/^\/+|\/+$/g, ""),
    forcePathStyle,
  };
  const ready =
    driver === "pg" ||
    Boolean(config.endpoint && config.bucket && config.accessKey && config.secretKey);
  return {
    driver,
    ready,
    config,
    source: storedDriver ? "settings" : fromEnv.complete ? "env" : "default",
    envComplete: fromEnv.complete,
  };
}

/**
 * @param {Record<string, unknown>} input
 * @returns {{ ok: true, value: StoredStorage } | { ok: false, error: string }}
 */
export function parseStorageForm(input) {
  const driver = input.driver === "s3" ? "s3" : "pg";
  const endpoint = trimSlash(String(input.endpoint ?? ""));
  const bucket = String(input.bucket ?? "").trim();
  const region = String(input.region ?? "").trim() || (endpoint ? "auto" : "us-east-1");
  const accessKey = String(input.accessKey ?? "").trim();
  const secretKey = String(input.secretKey ?? "").trim();
  const publicBase = trimSlash(String(input.publicBase ?? ""));
  const prefix = String(input.prefix ?? "").trim().replace(/^\/+|\/+$/g, "") || "folio";
  /** @type {boolean} */
  let forcePathStyle;
  if (input.forcePathStyle === true || input.forcePathStyle === false) {
    forcePathStyle = input.forcePathStyle;
  } else if (input.forcePathStyle === "path") {
    forcePathStyle = true;
  } else if (input.forcePathStyle === "virtual") {
    forcePathStyle = false;
  } else {
    forcePathStyle = defaultForcePathStyle(endpoint);
  }

  /** @type {StoredStorage} */
  const value = {
    driver,
    endpoint,
    bucket,
    region,
    accessKey,
    secretKey,
    publicBase,
    prefix,
    forcePathStyle,
  };

  if (driver === "pg") return { ok: true, value };
  if (!endpoint) return { ok: false, error: "需要 Endpoint" };
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { ok: false, error: "Endpoint 要用 http 或 https" };
    }
  } catch {
    return { ok: false, error: "Endpoint 不是合法 URL" };
  }
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,61}[a-zA-Z0-9]$/.test(bucket) &&
    !/^[a-zA-Z0-9]{3,63}$/.test(bucket)
  ) {
    return { ok: false, error: "桶名称不合规" };
  }
  if (!accessKey) return { ok: false, error: "需要 Access Key" };
  if (!secretKey) return { ok: false, error: "需要 Secret Key" };
  if (publicBase) {
    try {
      const url = new URL(publicBase);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return { ok: false, error: "公开前缀要用 http 或 https" };
      }
    } catch {
      return { ok: false, error: "公开前缀不是合法 URL" };
    }
  }
  if (prefix && !/^[a-zA-Z0-9][a-zA-Z0-9/_-]{0,62}$/.test(prefix)) {
    return { ok: false, error: "对象前缀只能用字母、数字、斜线" };
  }
  return { ok: true, value };
}

/**
 * @param {string} prefix
 * @param {number} id
 * @param {string} filename
 */
export function objectKey(prefix, id, filename) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new Error("无效附件");
  const safeName =
    String(filename || "file")
      .replace(/[^\w.\u4e00-\u9fff-]+/g, "_")
      .slice(0, 60) || "file";
  const p = String(prefix || "").replace(/^\/+|\/+$/g, "");
  return p ? `${p}/attachments/${n}/${safeName}` : `attachments/${n}/${safeName}`;
}

/**
 * @param {string} publicBase
 * @param {string} key
 */
export function publicObjectUrl(publicBase, key) {
  if (!publicBase || !key) return "";
  return `${trimSlash(publicBase)}/${String(key).replace(/^\/+/, "")}`;
}

/**
 * @param {string} src
 * @returns {number | null}
 */
export function attachmentIdFromSrc(src) {
  const raw = String(src ?? "").trim();
  if (!raw) return null;
  let path = raw;
  try {
    if (/^https?:\/\//i.test(raw)) path = new URL(raw).pathname;
  } catch {
    /* keep raw */
  }
  const file = /\/api\/files\/(\d+)(?:\/|$)/.exec(path);
  if (file) {
    const id = Number(file[1]);
    return Number.isInteger(id) && id > 0 ? id : null;
  }
  const object = /(?:^|\/)attachments\/(\d+)(?:\/|$)/.exec(path);
  if (object) {
    const id = Number(object[1]);
    return Number.isInteger(id) && id > 0 ? id : null;
  }
  return null;
}

/**
 * @param {ObjectStorageConfig} config
 * @param {string} key
 */
export function publicObjectUrlFromConfig(config, key) {
  if (!key) return "";
  if (config.publicBase) return publicObjectUrl(config.publicBase, key);
  if (!config.endpoint || !config.bucket) return "";
  const object = String(key).replace(/^\/+/, "");
  if (config.forcePathStyle) return `${trimSlash(config.endpoint)}/${config.bucket}/${object}`;
  try {
    const url = new URL(config.endpoint);
    return `${url.protocol}//${config.bucket}.${url.host}/${object}`;
  } catch {
    return "";
  }
}

/** @param {unknown} err */
function s3Error(err) {
  const error = /** @type {{ message?: string, name?: string, Code?: string, $metadata?: { httpStatusCode?: number } }} */ (
    err
  );
  const code = String(error?.name || error?.Code || "");
  const status = error?.$metadata?.httpStatusCode;
  if (code === "NoSuchBucket" || status === 404) return new Error("找不到这个桶");
  if (code === "InvalidAccessKeyId" || code === "SignatureDoesNotMatch") {
    return new Error("密钥不对");
  }
  if (code === "AccessDenied" || code === "AllAccessDisabled") return new Error("没有权限读写这个桶");
  const message = String(error?.message || err || "对象存储请求失败");
  return new Error(message.slice(0, 180));
}

/**
 * @param {ObjectStorageConfig} config
 */
async function getS3Client(config) {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: config.region || "us-east-1",
    endpoint: config.endpoint || undefined,
    forcePathStyle: Boolean(config.forcePathStyle),
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

/**
 * @param {ObjectStorageConfig} config
 */
export async function testObjectStorage(config) {
  const parsed = parseStorageForm({ ...config, driver: "s3" });
  if (!parsed.ok) throw new Error(parsed.error);
  const resolved = resolveStorage(parsed.value);
  if (!resolved.ready) throw new Error("对象存储未就绪");
  const client = await getS3Client(resolved.config);
  const { HeadBucketCommand } = await import("@aws-sdk/client-s3");
  try {
    await client.send(new HeadBucketCommand({ Bucket: resolved.config.bucket }));
  } catch (err) {
    throw s3Error(err);
  } finally {
    client.destroy();
  }
}

/**
 * @param {ObjectStorageConfig} config
 * @param {{ key: string, body: Buffer | Uint8Array, mime: string }} input
 */
export async function putObjectBytes(config, input) {
  const client = await getS3Client(config);
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.mime || "application/octet-stream",
        ContentLength: input.body.length,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (err) {
    throw s3Error(err);
  } finally {
    client.destroy();
  }
}

/**
 * @param {ObjectStorageConfig} config
 * @param {string} key
 * @returns {Promise<Buffer | null>}
 */
export async function getObjectBytes(config, key) {
  if (!key) return null;
  const client = await getS3Client(config);
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  try {
    const out = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
    const payload = out.Body ? await out.Body.transformToByteArray() : new Uint8Array();
    return Buffer.from(payload);
  } catch (err) {
    const error = /** @type {{ name?: string, $metadata?: { httpStatusCode?: number } }} */ (err);
    if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) return null;
    throw s3Error(err);
  } finally {
    client.destroy();
  }
}

/**
 * @param {ObjectStorageConfig} config
 * @param {string} key
 */
export async function deleteObjectBytes(config, key) {
  if (!key) return;
  const client = await getS3Client(config);
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  try {
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
  } catch (err) {
    const error = /** @type {{ name?: string, $metadata?: { httpStatusCode?: number } }} */ (err);
    if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) return;
    throw s3Error(err);
  } finally {
    client.destroy();
  }
}

/**
 * @param {ObjectStorageConfig} config
 * @param {string} [prefix]
 * @returns {Promise<string[]>}
 */
export async function listObjectKeys(config, prefix) {
  const client = await getS3Client(config);
  const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
  const p = String(prefix ?? config.prefix ?? "").replace(/^\/+|\/+$/g, "");
  const listPrefix = p ? `${p}/attachments/` : "attachments/";
  /** @type {string[]} */
  const keys = [];
  /** @type {string | undefined} */
  let token;
  try {
    do {
      const out = await client.send(
        new ListObjectsV2Command({
          Bucket: config.bucket,
          Prefix: listPrefix,
          ContinuationToken: token,
          MaxKeys: 1000,
        }),
      );
      for (const obj of out.Contents ?? []) {
        if (obj.Key) keys.push(obj.Key);
      }
      token = out.IsTruncated ? out.NextContinuationToken : undefined;
    } while (token);
    return keys;
  } catch (err) {
    throw s3Error(err);
  } finally {
    client.destroy();
  }
}

/**
 * @param {(text: string, params?: unknown[]) => Promise<Array<Record<string, unknown>>>} query
 * @param {NodeJS.ProcessEnv} [env]
 */
export async function loadResolvedStorage(query, env = process.env) {
  const rows = await query(`select value from site_settings where key = $1 limit 1`, [SETTING_KEY]);
  return resolveStorage(parseStoredValue(rows[0]?.value), env);
}

/**
 * @param {(text: string, params?: unknown[]) => Promise<Array<Record<string, unknown>>>} query
 * @param {ObjectStorageConfig} config
 */
export async function pushPgBytesToS3(query, config) {
  const rows = await query(
    `select id, filename, mime_type, data, object_key from attachments where data is not null`,
  );
  let moved = 0;
  const errors = [];
  for (const row of rows) {
    const id = Number(row.id);
    const raw = row.data;
    const bytes = raw ? Buffer.from(/** @type {Buffer | Uint8Array} */ (raw)) : Buffer.alloc(0);
    if (!bytes.length || !Number.isInteger(id)) continue;
    const key =
      (typeof row.object_key === "string" && row.object_key) ||
      objectKey(config.prefix, id, String(row.filename ?? "file"));
    try {
      await putObjectBytes(config, { key, body: bytes, mime: String(row.mime_type ?? "image/jpeg") });
      const url = publicObjectUrlFromConfig(config, key) || `/api/files/${id}`;
      await query(
        `update attachments set object_key = $1, data = null, url = $2 where id = $3`,
        [key, url, id],
      );
      moved += 1;
    } catch (err) {
      errors.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { moved, errors };
}

/**
 * @param {(text: string, params?: unknown[]) => Promise<Array<Record<string, unknown>>>} query
 * @param {ObjectStorageConfig} config
 */
export async function pullS3BytesToPg(query, config) {
  const rows = await query(
    `select id, object_key from attachments where object_key is not null and data is null`,
  );
  let moved = 0;
  const errors = [];
  for (const row of rows) {
    const id = Number(row.id);
    const key = String(row.object_key ?? "");
    if (!key || !Number.isInteger(id)) continue;
    try {
      const bytes = await getObjectBytes(config, key);
      if (!bytes?.length) {
        errors.push(`${id}: 对象不存在`);
        continue;
      }
      await query(`update attachments set data = $1, url = $2 where id = $3`, [
        bytes,
        `/api/files/${id}`,
        id,
      ]);
      moved += 1;
    } catch (err) {
      errors.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { moved, errors };
}
