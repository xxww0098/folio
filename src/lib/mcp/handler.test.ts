import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MCP_TOOLS, MCP_PROMPTS, toolByName } from "./catalog.ts";
import { MCP_PROTOCOL_VERSION, pickProtocolVersion, parseMcpBody, RPC } from "./protocol.ts";
import { claudeCli, cursorConfig, mcpEndpoint, vscodeConfig } from "./snippets.ts";

describe("mcp protocol", () => {
  it("picks a supported protocol version", () => {
    assert.equal(pickProtocolVersion("2025-03-26"), "2025-03-26");
    assert.equal(pickProtocolVersion("nope"), MCP_PROTOCOL_VERSION);
    assert.equal(pickProtocolVersion(undefined), MCP_PROTOCOL_VERSION);
  });

  it("parses single and batch bodies", () => {
    const single = parseMcpBody(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }));
    assert.ok("messages" in single);
    assert.equal(single.messages[0]?.method, "ping");
    const batch = parseMcpBody(JSON.stringify([{ jsonrpc: "2.0", method: "notifications/initialized" }]));
    assert.ok("messages" in batch);
    const bad = parseMcpBody("{");
    assert.ok("error" in bad);
    assert.equal(bad.error.error?.code, RPC.PARSE);
  });
});

describe("mcp catalog", () => {
  it("has unique tool and prompt names with object schemas", () => {
    const names = MCP_TOOLS.map((tool) => tool.name);
    assert.equal(new Set(names).size, names.length);
    for (const tool of MCP_TOOLS) {
      assert.equal(tool.inputSchema.type, "object");
      assert.ok(tool.description.length > 8);
    }
    assert.ok(toolByName("draft_post"));
    assert.ok(toolByName("publish_post"));
    assert.ok(toolByName("get_post"));
    assert.ok(toolByName("delete_post"));
    assert.ok(toolByName("upload_image"));
    assert.equal(MCP_PROMPTS.length, 2);
  });
});

describe("mcp snippets", () => {
  it("builds client configs from origin", () => {
    assert.equal(mcpEndpoint("https://folio.dev/"), "https://folio.dev/api/mcp");
    const cursor = cursorConfig("https://folio.dev", "folio_abc");
    assert.match(cursor, /https:\/\/folio.dev\/api\/mcp/);
    assert.match(cursor, /Bearer folio_abc/);
    assert.match(vscodeConfig("https://folio.dev"), /"type": "http"/);
    assert.match(claudeCli("https://folio.dev", "folio_abc"), /--transport http/);
  });
});
