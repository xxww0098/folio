import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { app } from "./app.ts";

describe("hono api", () => {
  it("health does not advertise a server stack", async () => {
    const res = await app.request("/api/health");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok: boolean; name: string };
    assert.equal(body.ok, true);
    assert.equal(body.name, "folio");
    assert.equal(res.headers.get("x-powered-by"), null);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("referrer-policy"), "no-referrer");
    assert.equal(res.headers.get("x-dns-prefetch-control"), "off");
    assert.match(res.headers.get("cache-control") ?? "", /max-age=60/);
  });

  it("rejects mcp without a token", async () => {
    const res = await app.request("/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "server/discover" }),
    });
    assert.equal(res.status, 401);
  });

  it("rejects obsidian without a token", async () => {
    const res = await app.request("/api/obsidian/me");
    assert.equal(res.status, 401);
  });
});
