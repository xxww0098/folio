import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { articleJsonLd, likeContains, pageDescription } from "./seo.ts";

describe("seo helpers", () => {
  it("clips descriptions without cutting mid-word messily", () => {
    assert.equal(pageDescription("短句"), "短句");
    assert.equal(pageDescription("a".repeat(200)).endsWith("…"), true);
    assert.ok(pageDescription("a".repeat(200)).length <= 160);
  });

  it("builds article json-ld without leaking paid body", () => {
    const data = articleJsonLd({
      title: "标题",
      excerpt: "导语",
      slug: "hello",
      authorName: "折页编辑部",
      publishedAt: "2026-08-09T00:00:00.000Z",
      coverImage: "/cover.jpg",
      origin: "https://folio.test",
    });
    assert.equal(data["@type"], "BlogPosting");
    assert.equal(data.mainEntityOfPage, "https://folio.test/posts/hello");
    assert.equal(data.image, "/cover.jpg");
  });

  it("strips like wildcards from search query", () => {
    assert.equal(likeContains("foo%bar_baz"), "%foobarbaz%");
    assert.equal(likeContains("  "), "%  %");
  });
});
