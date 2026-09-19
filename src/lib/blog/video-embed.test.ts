import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseVideoUrl, videoFromBlock } from "./video-embed.ts";

describe("video embeds", () => {
  it("parses youtube watch / short / share links", () => {
    const a = parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    const b = parseVideoUrl("https://youtu.be/dQw4w9WgXcQ");
    const c = parseVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ");
    assert.equal(a?.provider, "youtube");
    assert.equal(a?.embed, b?.embed);
    assert.equal(c?.embed.includes("dQw4w9WgXcQ"), true);
    assert.equal(a?.embed.includes("youtube-nocookie.com"), true);
  });

  it("parses bilibili BV and av", () => {
    const bv = parseVideoUrl("https://www.bilibili.com/video/BV1xx411c7mD");
    assert.equal(bv?.provider, "bilibili");
    assert.equal(bv?.embed.includes("bvid=BV1xx411c7mD"), true);
    const av = parseVideoUrl("https://www.bilibili.com/video/av170001");
    assert.equal(av?.embed.includes("aid=170001"), true);
  });

  it("parses vimeo, youku, ted and files", () => {
    assert.equal(parseVideoUrl("https://vimeo.com/123456789")?.provider, "vimeo");
    assert.equal(parseVideoUrl("https://v.youku.com/v_show/id_XMzI0NjQ5NjQ.html")?.provider, "youku");
    assert.equal(parseVideoUrl("https://www.ted.com/talks/ken_robinson")?.provider, "ted");
    assert.equal(parseVideoUrl("https://cdn.example.com/talk.mp4")?.kind, "file");
  });

  it("ignores ordinary links", () => {
    assert.equal(parseVideoUrl("https://example.com/watch?v=nope"), null);
    assert.equal(parseVideoUrl("javascript:alert(1)"), null);
  });

  it("reads a bare paragraph or markdown image as a video block", () => {
    assert.equal(videoFromBlock("https://youtu.be/dQw4w9WgXcQ")?.provider, "youtube");
    assert.equal(videoFromBlock("![讲解](https://www.bilibili.com/video/BV1xx411c7mD)")?.provider, "bilibili");
  });
});
