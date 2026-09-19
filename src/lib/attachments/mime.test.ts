import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sniffImageMime } from "./mime.ts";

describe("image mime sniff", () => {
  it("recognizes gif89a even when the declared type is empty", () => {
    const bytes = new TextEncoder().encode("GIF89a........");
    assert.equal(sniffImageMime(bytes, "loop.gif", ""), "image/gif");
    assert.equal(sniffImageMime(bytes, "loop.gif", "application/octet-stream"), "image/gif");
  });

  it("falls back to filename for gif", () => {
    assert.equal(sniffImageMime(new Uint8Array([1, 2, 3, 4]), "demo.gif", ""), "image/gif");
  });

  it("rejects unknown bytes", () => {
    assert.equal(sniffImageMime(new Uint8Array([0, 1, 2]), "note.txt", "text/plain"), null);
  });
});
