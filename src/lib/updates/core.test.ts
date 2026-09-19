import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAutoUpdate } from "./core.ts";

describe("auto update setting", () => {
  it("defaults off", () => {
    assert.equal(parseAutoUpdate(null).enabled, false);
    assert.equal(parseAutoUpdate("false").enabled, false);
  });

  it("reads json and plain true", () => {
    assert.equal(parseAutoUpdate("true").enabled, true);
    assert.equal(parseAutoUpdate(JSON.stringify({ enabled: true, lastTag: "v0.1.7" })).lastTag, "v0.1.7");
  });
});
