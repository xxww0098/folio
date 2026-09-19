import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MCP_TOOLS, MCP_PROMPTS, toolByName } from "./catalog.ts";
import {
  MCP_PROTOCOL_VERSION,
  MCP_SUPPORTED_VERSIONS,
  pickProtocolVersion,
  parseMcpBody,
  RPC,
  unsupportedVersionError,
} from "./protocol.ts";
import { claudeCli, cursorConfig, mcpEndpoint, vscodeConfig } from "./snippets.ts";

describe("mcp protocol", () => {
  it("only speaks 2026-07-28", () => {
    assert.equal(MCP_PROTOCOL_VERSION, "2026-07-28");
    assert.deepEqual([...MCP_SUPPORTED_VERSIONS], ["2026-07-28"]);
    assert.equal(pickProtocolVersion("2026-07-28"), "2026-07-28");
    assert.equal(pickProtocolVersion("2025-11-25"), MCP_PROTOCOL_VERSION);
    assert.equal(pickProtocolVersion("2025-03-26"), MCP_PROTOCOL_VERSION);
    assert.equal(pickProtocolVersion("2024-11-05"), MCP_PROTOCOL_VERSION);
    assert.equal(pickProtocolVersion("nope"), MCP_PROTOCOL_VERSION);
    assert.equal(pickProtocolVersion(undefined), "2026-07-28");
    const err = unsupportedVersionError(1, "2025-11-25");
    assert.equal(err.error?.code, RPC.UNSUPPORTED_VERSION);
    assert.deepEqual((err.error?.data as { supported: string[] }).supported, ["2026-07-28"]);
  });

  it("parses single and batch bodies", () => {
    const single = parseMcpBody(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "server/discover" }));
    assert.ok("messages" in single);
    assert.equal(single.messages[0]?.method, "server/discover");
    const batch = parseMcpBody(JSON.stringify([{ jsonrpc: "2.0", method: "notifications/message" }]));
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
    assert.ok(toolByName("site_overview"));
    assert.ok(toolByName("list_comments"));
    assert.ok(toolByName("add_comment"));
    assert.ok(toolByName("create_moment"));
    assert.ok(toolByName("list_links"));
    assert.ok(toolByName("set_front_page"));
    assert.ok(toolByName("add_topic"));
    assert.ok(toolByName("get_revision"));
    assert.equal(MCP_PROMPTS.length, 4);
  });
});

describe("mcp snippets", () => {
  it("builds client configs from origin", () => {
    assert.equal(mcpEndpoint("https://folio.dev/"), "https://folio.dev/api/mcp");
    const cursor = cursorConfig("https://folio.dev", "folio_abc");
    assert.match(cursor, /https:\/\/folio.dev\/api\/mcp/);
    assert.match(cursor, /Bearer folio_abc/);
    assert.match(cursor, /2026-07-28/);
    assert.match(vscodeConfig("https://folio.dev"), /"type": "http"/);
    assert.match(claudeCli("https://folio.dev", "folio_abc"), /--transport http/);
    assert.match(claudeCli("https://folio.dev", "folio_abc"), /MCP-Protocol-Version: 2026-07-28/);
  });
});
