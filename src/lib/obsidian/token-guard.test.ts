import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authLock, clientAuthKey, isFolioToken, noteAuthFailure, noteAuthSuccess, resetTokenGuard } from "./token-guard.ts";

describe("folio tokens", () => {
  it("rejects short or malformed secrets", () => {
    assert.equal(isFolioToken("folio_short"), false);
    assert.equal(isFolioToken("other_abcdefghijklmnopqrstuvwxyz0123456789abcd"), false);
    assert.equal(isFolioToken("folio_abcdefghijklmnopqrstuvwxyz0123456789abcd"), true);
  });
});

describe("token brute-force guard", () => {
  it("locks after repeated failures", () => {
    resetTokenGuard();
    const req = new Request("http://folio.test/api/mcp", {
      headers: { authorization: "Bearer folio_abcdefghijklmnopqrstuvwxyz0123456789abcd", "x-forwarded-for": "203.0.113.9" },
    });
    const key = clientAuthKey(req, req.headers.get("authorization") ?? "");
    for (let i = 0; i < 8; i += 1) noteAuthFailure(key);
    const lock = authLock(key);
    assert.equal(lock.locked, true);
    if (lock.locked) assert.ok(lock.retryAfterSec > 60);
    noteAuthSuccess(key);
    assert.equal(authLock(key).locked, false);
  });
});
