import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseWikiQuery, suggestWiki, wikiTokenFor } from "./wiki-suggest.ts";

const catalog = [
  { slug: "rust-ownership", title: "Rust 所有权：别把借用当礼物", headings: [{ id: "s-0", text: "借用" }] },
  { slug: "go-select", title: "Go select 超时", headings: [{ id: "s-0", text: "超时不要睡死" }] },
];

describe("wiki suggest", () => {
  it("parses title and heading", () => {
    assert.deepEqual(parseWikiQuery("rust#借用"), { target: "rust", heading: "借用", headingMode: true });
  });

  it("ranks prefix and title matches", () => {
    const hits = suggestWiki("rust", catalog);
    assert.equal(hits[0]?.slug, "rust-ownership");
    assert.match(hits[0]?.inner ?? "", /rust-ownership/);
  });

  it("lists headings after #", () => {
    const hits = suggestWiki("go#超时", catalog);
    assert.equal(hits[0]?.heading, "超时不要睡死");
  });

  it("uses Obsidian-style alias token", () => {
    assert.equal(wikiTokenFor(catalog[0]!), "rust-ownership|Rust 所有权");
  });
});
