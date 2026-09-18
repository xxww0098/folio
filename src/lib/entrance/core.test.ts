import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cookieMatchesEntrance,
  encodeEntrance,
  entranceFromBytes,
  generateEntrance,
  parseEntrance,
  reservedEntrance,
  sameSecret,
} from "./core.ts";

describe("parseEntrance", () => {
  it("treats empty as disabled", () => {
    assert.deepEqual(parseEntrance("  "), { ok: true, value: "" });
  });

  it("accepts alphanumeric 5–116", () => {
    assert.deepEqual(parseEntrance("Ab12c"), { ok: true, value: "Ab12c" });
    assert.equal(parseEntrance("abcd").ok, false);
    assert.equal(parseEntrance("has-dash").ok, false);
    assert.equal(parseEntrance("has space").ok, false);
  });

  it("rejects reserved public routes", () => {
    assert.equal(parseEntrance("about").ok, false);
    assert.equal(parseEntrance("Console").ok, false);
    assert.equal(parseEntrance("write").ok, false);
    assert.equal(reservedEntrance("MCP"), true);
  });
});

describe("entrance cookie", () => {
  it("encodes like a standard base64 secret", () => {
    assert.equal(encodeEntrance("abcde"), "YWJjZGU=");
    assert.equal(cookieMatchesEntrance("YWJjZGU=", "abcde"), true);
    assert.equal(cookieMatchesEntrance("YWJjZGU", "abcde"), false);
    assert.equal(cookieMatchesEntrance("YWJjZGU=", "abcdf"), false);
    assert.equal(cookieMatchesEntrance("", "abcde"), false);
    assert.equal(cookieMatchesEntrance("YWJjZGU=", ""), false);
    assert.equal(sameSecret("abcde", "abcde"), true);
    assert.equal(sameSecret("abcde", "abcdf"), false);
    assert.equal(sameSecret("abcde", "abcd"), false);
  });
});

describe("generateEntrance", () => {
  it("maps bytes through the alphabet and stays valid", () => {
    const fromBytes = entranceFromBytes(Uint8Array.from([0, 61, 62, 10, 255]));
    assert.equal(fromBytes.length, 5);
    assert.match(fromBytes, /^[a-zA-Z0-9]+$/);
    const value = generateEntrance();
    assert.equal(parseEntrance(value).ok, true);
    assert.equal(value.length, 10);
  });
});
