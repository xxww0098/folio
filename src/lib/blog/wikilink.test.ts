import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildWikiGraph,
  extractHeadings,
  extractWikiLinks,
  findUnlinkedMentions,
  parseWikiInner,
  resolveWikiTarget,
  snippetAround,
  wikiShortLabel,
} from "./wikilink.ts";

describe("parseWikiInner", () => {
  it("reads slug, heading, block and alias", () => {
    assert.deepEqual(parseWikiInner("rust-ownership"), { target: "rust-ownership", heading: undefined, block: undefined, alias: undefined });
    assert.deepEqual(parseWikiInner("rust-ownership|所有权"), {
      target: "rust-ownership",
      heading: undefined,
      block: undefined,
      alias: "所有权",
    });
    assert.deepEqual(parseWikiInner("go-select#超时不要睡死"), {
      target: "go-select",
      heading: "超时不要睡死",
      block: undefined,
      alias: undefined,
    });
    assert.deepEqual(parseWikiInner("#类型也是值"), {
      target: "",
      heading: "类型也是值",
      block: undefined,
      alias: undefined,
    });
    assert.deepEqual(parseWikiInner("note.md#^decision|结论"), {
      target: "note",
      heading: undefined,
      block: "decision",
      alias: "结论",
    });
  });
});

describe("extractWikiLinks", () => {
  it("skips fenced and inline code", () => {
    const source = [
      "见 [[rust-ownership]] 和 `[[not-a-link]]`。",
      "",
      "```ts",
      "const x = '[[also-not]]';",
      "```",
      "",
      "以及 [[go-select#超时不要睡死|超时]]。",
    ].join("\n");
    const links = extractWikiLinks(source);
    assert.equal(links.length, 2);
    assert.equal(links[0]?.target, "rust-ownership");
    assert.equal(links[1]?.alias, "超时");
  });
});

describe("resolveWikiTarget", () => {
  const catalog = [
    { slug: "rust-ownership", title: "所有权：借用检查器到底在查什么" },
    { slug: "ts-discriminated-unions", title: "判别联合：让非法状态无法表示" },
    { slug: "go-select", title: "select：一个 goroutine 如何同时等很多件事" },
  ];

  it("matches slug, full title or distinctive short title", () => {
    assert.equal(resolveWikiTarget("rust-ownership", catalog)?.slug, "rust-ownership");
    assert.equal(resolveWikiTarget("所有权：借用检查器到底在查什么", catalog)?.slug, "rust-ownership");
    assert.equal(resolveWikiTarget("判别联合", catalog)?.slug, "ts-discriminated-unions");
    assert.equal(resolveWikiTarget("missing", catalog), null);
  });

  it("does not treat generic latin prefixes as aliases", () => {
    assert.equal(resolveWikiTarget("select", catalog), null);
  });
});

describe("buildWikiGraph", () => {
  it("builds outgoing, backlinks and unlinked mentions", () => {
    const notes = [
      { slug: "a", title: "甲篇长标题测试", headings: [{ id: "s-0", text: "第一节" }] },
      { slug: "b", title: "乙", headings: [] },
      { slug: "c", title: "丙", headings: [] },
    ];
    const bodies = {
      a: "甲提到 [[乙]]。",
      b: "乙回到 [[甲篇长标题测试#第一节]]。",
      c: "丙只是写了甲篇长标题测试，没有做成双链。",
    };
    const graph = buildWikiGraph("a", bodies.a, notes, bodies);
    assert.equal(graph.outgoing[0]?.slug, "b");
    assert.equal(graph.backlinks[0]?.slug, "b");
    assert.equal(graph.backlinks[0]?.heading, "第一节");
    assert.equal(graph.backlinks[0]?.headingId, "s-0");
    assert.equal(graph.unlinked[0]?.slug, "c");
  });
});

describe("findUnlinkedMentions", () => {
  it("ignores titles already wrapped in wiki links or code", () => {
    const catalog = [
      { slug: "a", title: "甲篇长标题测试", headings: [] },
      { slug: "b", title: "乙篇长标题测试", headings: [] },
    ];
    const source = "已链 [[甲篇长标题测试]]，代码里 `乙篇长标题测试`，正文再写乙篇长标题测试。";
    const hits = findUnlinkedMentions(source, catalog, "x");
    assert.deepEqual(
      hits.map((item) => item.slug),
      ["b"],
    );
  });
});

describe("snippetAround", () => {
  it("strips wiki markup in the window", () => {
    const snippet = snippetAround("前文。见 [[rust-ownership|所有权]] 继续。", "[[rust-ownership|所有权]]");
    assert.match(snippet, /所有权/);
    assert.equal(snippet.includes("[["), false);
  });

  it("does not leak a cut wiki token", () => {
    const source = "Rust 用 [[rust-ownership#^ledger|所有权账本]] 在编译期做同样的事。取消信号从 HTTP 传到 worker，见 [[hono-typed-routes]]。";
    const snippet = snippetAround(source, "[[rust-ownership#^ledger|所有权账本]]");
    assert.equal(snippet.includes("[["), false);
    assert.match(snippet, /所有权账本/);
  });
});

describe("wikiShortLabel", () => {
  it("cuts at the first fullwidth colon", () => {
    assert.equal(wikiShortLabel("判别联合：让非法状态无法表示"), "判别联合");
  });
});

describe("extractHeadings", () => {
  it("assigns stable ids and strips wiki markup", () => {
    const headings = extractHeadings("## 写成互斥的形状\n\ntext\n\n### 见 [[go-select|select]]\n");
    assert.deepEqual(headings, [
      { id: "s-0", text: "写成互斥的形状", level: 2 },
      { id: "s-1", text: "见 select", level: 3 },
    ]);
  });
});

