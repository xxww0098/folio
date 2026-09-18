import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isNewerRelease, parseVersion } from "./release.ts";

describe("release version", () => {
  it("strips v prefix", () => {
    assert.equal(parseVersion("v0.1.0"), "0.1.0");
    assert.equal(parseVersion("0.2.0"), "0.2.0");
  });

  it("detects newer semver tags", () => {
    assert.equal(isNewerRelease("0.1.0", "v0.1.1"), true);
    assert.equal(isNewerRelease("0.1.0", "0.1.0"), false);
    assert.equal(isNewerRelease("v0.2.0", "0.1.9"), false);
    assert.equal(isNewerRelease("0.1.0", "1.0.0"), true);
  });
});
