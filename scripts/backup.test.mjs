import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import {
  SNAPSHOT_KIND,
  SNAPSHOT_TABLES,
  applySnapshot,
  collectSnapshot,
  decodeCell,
  encodeCell,
  hydrateAttachmentBytes,
  parseSnapshot,
  quoteIdent,
  summarizeSnapshot,
} from "./backup.mjs";
import { pendingMigrations } from "./migration-plan.mjs";
import { projectRoot } from "./with-app-env.mjs";

describe("encodeCell", () => {
  it("round-trips bytea, dates and nulls", () => {
    const buf = Buffer.from("hello");
    assert.deepEqual(encodeCell(buf), { $folio: "bytea", data: "aGVsbG8=" });
    assert.deepEqual(decodeCell(encodeCell(buf)), buf);
    assert.equal(encodeCell(null), null);
    assert.equal(decodeCell(null), null);
    assert.equal(encodeCell(new Date("2026-09-18T00:00:00.000Z")), "2026-09-18T00:00:00.000Z");
    assert.equal(encodeCell(10n), 10);
    assert.equal(quoteIdent('user'), '"user"');
    assert.equal(quoteIdent('a"b'), '"a""b"');
  });
});

describe("parseSnapshot", () => {
  it("rejects foreign files and accepts a v1 snapshot", () => {
    assert.equal(parseSnapshot(null).ok, false);
    assert.equal(parseSnapshot({ kind: "other", version: 1, tables: {} }).ok, false);
    assert.equal(parseSnapshot({ kind: SNAPSHOT_KIND, version: 99, tables: {} }).ok, false);
    const ok = parseSnapshot({ kind: SNAPSHOT_KIND, version: 1, tables: { posts: [] } });
    assert.equal(ok.ok, true);
    const summary = summarizeSnapshot({
      exportedAt: "2026-09-18T00:00:00.000Z",
      tables: { posts: [{ id: 1 }, { id: 2 }], attachments: [] },
    });
    assert.equal(summary.counts.posts, 2);
    assert.equal(summary.counts.attachments, 0);
    assert.ok(SNAPSHOT_TABLES.some((table) => table.name === "posts"));
    assert.ok(
      SNAPSHOT_TABLES.some((table) => table.name === "attachments" && table.columns.includes("object_key")),
    );
  });
});

describe("hydrateAttachmentBytes", () => {
  it("fills missing bytea from object storage", async () => {
    const snapshot = {
      tables: {
        attachments: [
          { id: 1, object_key: "folio/attachments/1/a.png", data: null },
          { id: 2, object_key: "folio/attachments/2/b.png", data: { $folio: "bytea", data: "Zg==" } },
        ],
      },
    };
    const { filled } = await hydrateAttachmentBytes(snapshot, async (key) => {
      if (key.endsWith("a.png")) return Buffer.from("hello");
      throw new Error("should not fetch existing bytes");
    });
    assert.equal(filled, 1);
    assert.deepEqual(snapshot.tables.attachments[0].data, {
      $folio: "bytea",
      data: Buffer.from("hello").toString("base64"),
    });
    assert.deepEqual(snapshot.tables.attachments[1].data, { $folio: "bytea", data: "Zg==" });
  });
});

describe("collectSnapshot / applySnapshot", () => {
  it("restores owner, post and attachment bytes on a migrated database", async () => {
    const pg = new PGlite();
    await pg.waitReady;
    const migrationsDir = join(projectRoot(), "migrations");
    const entries = await readdir(migrationsDir);
    for (const { name } of pendingMigrations(entries, [])) {
      const text = await readFile(join(migrationsDir, name), "utf8");
      await pg.exec(text);
    }

    const query = async (text, params = []) => (await pg.query(text, params)).rows;

    await query(
      `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
       values ($1, $2, $3, true, now(), now())`,
      ["u1", "站长", "owner@example.com"],
    );
    await query(`insert into user_roles (user_id, role) values ($1, 'admin')`, ["u1"]);
    await query(
      `insert into posts (id, user_id, author_name, slug, title, excerpt, body, topic, status)
       values (7, $1, $2, $3, $4, $5, $6, $7, 'published')`,
      ["u1", "站长", "hello", "你好", "摘", "正文", "Go"],
    );
    const bytes = Buffer.from([1, 2, 3, 4]);
    await query(
      `insert into attachments (id, user_id, filename, mime_type, size_bytes, url, alt, group_name, data)
       values (3, $1, $2, $3, $4, $5, '', '封面', $6)`,
      ["u1", "pic.png", "image/png", bytes.length, "/api/files/3", bytes],
    );

    const snapshot = await collectSnapshot(query, { appVersion: "test" });
    assert.equal(snapshot.kind, SNAPSHOT_KIND);
    assert.equal(snapshot.tables.posts.length, 1);
    assert.equal(snapshot.tables.posts[0].slug, "hello");
    assert.deepEqual(snapshot.tables.attachments[0].data, {
      $folio: "bytea",
      data: bytes.toString("base64"),
    });

    await query(`insert into posts (user_id, author_name, slug, title, excerpt, body, topic, status)
      values ('u1', '站长', 'noise', 'x', 'x', 'x', 'Go', 'draft')`);

    await pg.transaction(async (tx) => {
      await applySnapshot(async (text, params = []) => (await tx.query(text, params)).rows, snapshot);
    });

    const posts = await query(`select slug, title from posts order by id`);
    assert.deepEqual(posts, [{ slug: "hello", title: "你好" }]);
    const files = await query(`select id, data, object_key from attachments`);
    assert.equal(files.length, 1);
    assert.deepEqual(Buffer.from(files[0].data), bytes);
    assert.equal(files[0].object_key, null);
    const users = await query(`select email from "user"`);
    assert.deepEqual(users, [{ email: "owner@example.com" }]);
  });
});
