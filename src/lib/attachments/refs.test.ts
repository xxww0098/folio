import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  orphanObjectKeys,
  referencesAttachment,
  unreferencedAttachmentIds,
} from "./refs.ts";

describe("attachment references", () => {
  it("matches local file urls without treating 12 as 123", () => {
    const twelve = { id: 12, url: "/api/files/12/cover.jpg", objectKey: "folio/attachments/12/cover.jpg" };
    const blob = "封面 ![](/api/files/123/other.jpg) 和 https://cdn.example.com/folio/attachments/123/a.png";
    assert.equal(referencesAttachment(blob, twelve), false);
    assert.equal(referencesAttachment("正文 /api/files/12 结尾", twelve), true);
    assert.equal(referencesAttachment("![](/api/files/12/cover.jpg)", twelve), true);
  });

  it("matches public object urls by key and path", () => {
    const item = {
      id: 3,
      url: "https://cdn.example.com/folio/attachments/3/a.png",
      objectKey: "folio/attachments/3/a.png",
    };
    assert.equal(referencesAttachment("cover: https://cdn.example.com/folio/attachments/3/a.png", item), true);
    assert.equal(referencesAttachment("minio/folio/attachments/3/a.png", item), true);
    assert.equal(referencesAttachment("nothing here", item), false);
  });

  it("skips fresh unused files during grace, then deletes them", () => {
    const now = Date.parse("2026-09-19T12:00:00.000Z");
    const items = [
      {
        id: 1,
        url: "https://cdn.example.com/folio/attachments/1/a.png",
        objectKey: "folio/attachments/1/a.png",
        stored: true,
        createdAt: "2026-09-19T11:59:50.000Z",
      },
      {
        id: 2,
        url: "https://cdn.example.com/folio/attachments/2/b.png",
        objectKey: "folio/attachments/2/b.png",
        stored: true,
        createdAt: "2026-09-19T11:00:00.000Z",
      },
      {
        id: 3,
        url: "/covers/01-ts.jpg",
        stored: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    assert.deepEqual(unreferencedAttachmentIds(items, "seed /covers/01-ts.jpg", now, 60_000), [2]);
    assert.deepEqual(unreferencedAttachmentIds(items, "seed /covers/01-ts.jpg", now, 0), [1, 2]);
    assert.deepEqual(
      unreferencedAttachmentIds(items, "still using folio/attachments/2/b.png", now, 0),
      [1],
    );
  });

  it("finds object keys that have no attachment row", () => {
    assert.deepEqual(
      orphanObjectKeys(
        ["folio/attachments/1/a.png", "folio/attachments/9/ghost.png", ""],
        ["folio/attachments/1/a.png", null],
      ),
      ["folio/attachments/9/ghost.png"],
    );
  });
});
