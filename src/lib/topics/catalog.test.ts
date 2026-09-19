import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_TOPICS, parseTopics, normalizeTopicName } from "./catalog.ts";

describe("topics catalog", () => {
  it("falls back to defaults", () => {
    assert.deepEqual(parseTopics(null), [...DEFAULT_TOPICS]);
    assert.deepEqual(parseTopics("[]"), [...DEFAULT_TOPICS]);
  });

  it("keeps unique trimmed names", () => {
    assert.deepEqual(parseTopics(JSON.stringify(["  随笔  ", "随笔", "日志"])), ["随笔", "日志"]);
  });

  it("clips long names", () => {
    assert.equal(normalizeTopicName("  这是一个很长很长的分类名称超过限制  ").length <= 20, true);
  });
});
