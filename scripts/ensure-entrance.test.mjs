import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  entranceHref,
  formatEntranceLines,
  generateEntranceValue,
  originFromEnv,
  SETTING_KEY,
  ensureEntrance,
} from "./ensure-entrance.mjs";

describe("generateEntranceValue", () => {
  it("emits 10 alphanumeric chars", () => {
    const value = generateEntranceValue();
    assert.match(value, /^[a-zA-Z0-9]{10}$/);
    assert.notEqual(generateEntranceValue(), generateEntranceValue());
  });
});

describe("entrance URL", () => {
  it("strips trailing slashes on the origin", () => {
    assert.equal(originFromEnv({ BETTER_AUTH_URL: "https://blog.example.com/" }), "https://blog.example.com");
    assert.equal(originFromEnv({}), "http://localhost:8011");
    assert.equal(entranceHref("https://blog.example.com/", "Ab12cXy90Q"), "https://blog.example.com/Ab12cXy90Q");
    assert.equal(entranceHref("http://localhost:8011", ""), "");
  });
});

describe("formatEntranceLines", () => {
  it("prints a first-boot banner with the full URL", () => {
    const lines = formatEntranceLines({
      created: true,
      origin: "http://localhost:8011",
      path: "Ab12cXy90Q",
    });
    assert.ok(lines.some((line) => line.includes("已生成后台入口")));
    assert.ok(lines.some((line) => line.includes("http://localhost:8011/Ab12cXy90Q")));
    assert.ok(lines.some((line) => line.includes("/console")));
  });

  it("prints a one-liner on later boots and a closed notice when empty", () => {
    const later = formatEntranceLines({
      created: false,
      origin: "https://blog.example.com",
      path: "Ab12cXy90Q",
    });
    assert.equal(later.length, 1);
    assert.match(later[0], /后台入口 {2}https:\/\/blog.example.com\/Ab12cXy90Q/);
    const closed = formatEntranceLines({ created: false, origin: "http://localhost:8011", path: "" });
    assert.match(closed[0], /已关闭/);
  });
});

describe("ensureEntrance", () => {
  it("creates a path when the row is missing, keeps an existing one", async () => {
    /** @type {Record<string, string>} */
    const store = {};
    const client = {
      async query(text, params = []) {
        if (text.startsWith("select")) {
          const value = store[params[0]];
          return { rows: value === undefined ? [] : [{ value }] };
        }
        store[params[0]] = params[1];
        return { rows: [] };
      },
    };
    const first = await ensureEntrance(client, () => "Ab12cXy90Q");
    assert.deepEqual(first, { created: true, path: "Ab12cXy90Q" });
    assert.equal(store[SETTING_KEY], "Ab12cXy90Q");
    const second = await ensureEntrance(client, () => "shouldNotWrite");
    assert.deepEqual(second, { created: false, path: "Ab12cXy90Q" });
  });

  it("does not regenerate after an admin cleared the path", async () => {
    const store = { [SETTING_KEY]: "" };
    const client = {
      async query(text, params = []) {
        if (text.startsWith("select")) {
          const value = store[params[0]];
          return { rows: value === undefined ? [] : [{ value }] };
        }
        store[params[0]] = params[1];
        return { rows: [] };
      },
    };
    const result = await ensureEntrance(client, () => "newPath999");
    assert.deepEqual(result, { created: false, path: "" });
    assert.equal(store[SETTING_KEY], "");
  });
});
