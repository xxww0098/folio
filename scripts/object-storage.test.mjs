import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  configFromEnv,
  defaultForcePathStyle,
  objectKey,
  parseStorageForm,
  parseStoredValue,
  publicObjectUrl,
  publicObjectUrlFromConfig,
  attachmentIdFromSrc,
  resolveStorage,
} from "./object-storage.mjs";

describe("parseStorageForm", () => {
  it("allows empty postgres mode", () => {
    const parsed = parseStorageForm({ driver: "pg" });
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.value.driver, "pg");
  });

  it("requires a complete s3 form", () => {
    assert.equal(parseStorageForm({ driver: "s3" }).ok, false);
    assert.equal(
      parseStorageForm({
        driver: "s3",
        endpoint: "not-a-url",
        bucket: "folio",
        accessKey: "a",
        secretKey: "b",
      }).ok,
      false,
    );
    const ok = parseStorageForm({
      driver: "s3",
      endpoint: "https://account.r2.cloudflarestorage.com",
      bucket: "folio",
      region: "auto",
      accessKey: "ak",
      secretKey: "sk",
      prefix: "blog",
    });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.value.forcePathStyle, true);
      assert.equal(ok.value.prefix, "blog");
    }
  });

  it("uses virtual-host style for AWS and Aliyun", () => {
    assert.equal(defaultForcePathStyle("https://s3.amazonaws.com"), false);
    assert.equal(defaultForcePathStyle("https://oss-cn-hangzhou.aliyuncs.com"), false);
    assert.equal(defaultForcePathStyle("https://minio.internal:9000"), true);
  });
});

describe("resolveStorage", () => {
  it("defaults to postgres", () => {
    const resolved = resolveStorage(null, {});
    assert.equal(resolved.driver, "pg");
    assert.equal(resolved.source, "default");
    assert.equal(resolved.ready, true);
  });

  it("picks env when settings are empty", () => {
    const resolved = resolveStorage(null, {
      FOLIO_S3_ENDPOINT: "http://minio:9000/",
      FOLIO_S3_BUCKET: "folio",
      FOLIO_S3_ACCESS_KEY: "ak",
      FOLIO_S3_SECRET_KEY: "sk",
    });
    assert.equal(resolved.driver, "s3");
    assert.equal(resolved.source, "env");
    assert.equal(resolved.ready, true);
    assert.equal(resolved.config.endpoint, "http://minio:9000");
    assert.equal(resolved.config.forcePathStyle, true);
  });

  it("lets console postgres override env", () => {
    const resolved = resolveStorage(
      { driver: "pg", secretKey: "kept" },
      {
        FOLIO_S3_ENDPOINT: "http://minio:9000",
        FOLIO_S3_BUCKET: "folio",
        FOLIO_S3_ACCESS_KEY: "ak",
        FOLIO_S3_SECRET_KEY: "sk",
      },
    );
    assert.equal(resolved.driver, "pg");
    assert.equal(resolved.source, "settings");
    assert.equal(resolved.config.secretKey, "kept");
  });

  it("fills missing settings fields from env", () => {
    const resolved = resolveStorage(
      { driver: "s3", endpoint: "https://example.com", bucket: "blog" },
      {
        FOLIO_S3_ACCESS_KEY: "ak",
        FOLIO_S3_SECRET_KEY: "sk",
      },
    );
    assert.equal(resolved.ready, true);
    assert.equal(resolved.config.accessKey, "ak");
    assert.equal(resolved.config.secretKey, "sk");
  });
});

describe("keys", () => {
  it("builds a stable object key", () => {
    assert.equal(objectKey("folio", 3, "封面.png"), "folio/attachments/3/封面.png");
    assert.equal(objectKey("", 3, "a b.jpg"), "attachments/3/a_b.jpg");
    assert.equal(publicObjectUrl("https://cdn.example.com/", "folio/a.jpg"), "https://cdn.example.com/folio/a.jpg");
    assert.equal(attachmentIdFromSrc("/api/files/12"), 12);
    assert.equal(attachmentIdFromSrc("https://blog.example.com/api/files/12"), 12);
    assert.equal(attachmentIdFromSrc("/api/files/12/封面.png"), 12);
    assert.equal(attachmentIdFromSrc("https://cdn.example.com/folio/attachments/12/a.png"), 12);
    assert.equal(attachmentIdFromSrc("http://minio:9000/folio/folio/attachments/3/a.png"), 3);
    assert.equal(attachmentIdFromSrc("/covers/01-ts.jpg"), null);
    assert.equal(
      publicObjectUrlFromConfig(
        {
          endpoint: "http://minio:9000",
          bucket: "folio",
          region: "auto",
          accessKey: "a",
          secretKey: "b",
          publicBase: "",
          prefix: "folio",
          forcePathStyle: true,
        },
        "folio/attachments/3/a.png",
      ),
      "http://minio:9000/folio/folio/attachments/3/a.png",
    );
    assert.equal(
      publicObjectUrlFromConfig(
        {
          endpoint: "https://s3.amazonaws.com",
          bucket: "folio",
          region: "us-east-1",
          accessKey: "a",
          secretKey: "b",
          publicBase: "https://cdn.example.com",
          prefix: "folio",
          forcePathStyle: false,
        },
        "folio/a.png",
      ),
      "https://cdn.example.com/folio/a.png",
    );
  });

  it("parses stored JSON", () => {
    assert.equal(parseStoredValue(""), null);
    assert.deepEqual(parseStoredValue('{"driver":"s3"}'), { driver: "s3" });
    assert.equal(configFromEnv({}).complete, false);
  });
});
