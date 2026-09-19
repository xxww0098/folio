import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_FRONT_PAGES, parseFrontPages } from "./visibility.ts";

describe("front page flags", () => {
  it("defaults every page on", () => {
    assert.deepEqual(parseFrontPages(null), DEFAULT_FRONT_PAGES);
    assert.equal(parseFrontPages("{}").moments, true);
  });

  it("keeps unknown keys out and honors false", () => {
    const next = parseFrontPages(JSON.stringify({ moments: false, photos: false, extra: true }));
    assert.equal(next.moments, false);
    assert.equal(next.photos, false);
    assert.equal(next.archive, true);
    assert.equal(next.links, true);
  });
});
