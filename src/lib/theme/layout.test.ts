import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isLayoutId, LAYOUT_IDS, LAYOUTS, parseLayoutId } from "./layout.ts";

describe("layout catalog", () => {
  it("covers every layout id", () => {
    assert.deepEqual(
      LAYOUTS.map((item) => item.id),
      [...LAYOUT_IDS],
    );
  });

  it("parses with fallback", () => {
    assert.equal(isLayoutId("grid"), true);
    assert.equal(isLayoutId("masonry"), false);
    assert.equal(parseLayoutId("stream"), "stream");
    assert.equal(parseLayoutId("nope"), "stack");
  });
});
