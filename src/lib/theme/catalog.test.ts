import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isThemeId, isThemeMode, parseThemeId, parseThemeMode, THEME_IDS, THEMES } from "./catalog.ts";

describe("theme catalog", () => {
  it("has unique ids covering THEME_IDS", () => {
    const ids = THEMES.map((theme) => theme.id);
    assert.deepEqual(ids, [...THEME_IDS]);
    assert.equal(new Set(ids).size, THEME_IDS.length);
  });

  it("requires name, tagline and both swatches", () => {
    for (const theme of THEMES) {
      assert.ok(theme.name.length > 0);
      assert.ok(theme.tagline.length > 0);
      assert.match(theme.swatches.light.primary, /^#/);
      assert.match(theme.swatches.light.headerForeground, /^#/);
      assert.match(theme.swatches.dark.header, /^#/);
    }
  });

  it("parses ids and modes with fallbacks", () => {
    assert.equal(isThemeId("earth"), true);
    assert.equal(isThemeId("nope"), false);
    assert.equal(parseThemeId("mist"), "mist");
    assert.equal(parseThemeId("nope"), "earth");
    assert.equal(isThemeMode("system"), true);
    assert.equal(parseThemeMode(undefined), "system");
  });
});
