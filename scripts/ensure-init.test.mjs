import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatInitLines } from "./ensure-init.mjs";

describe("formatInitLines", () => {
  it("prints address, email and password together on first boot", () => {
    const lines = formatInitLines({
      origin: "http://localhost:8011",
      path: "Ab12cXy90Q",
      createdEntrance: true,
      createdAdmin: true,
      email: "u9k2mqp1ax@folio.local",
      password: "correct-horse-battery",
    });
    assert.ok(lines.some((line) => line.includes("安装完成")));
    assert.ok(lines.some((line) => line.includes("http://localhost:8011/Ab12cXy90Q")));
    assert.ok(lines.some((line) => line.includes("u9k2mqp1ax@folio.local")));
    assert.ok(lines.some((line) => line.includes("correct-horse-battery")));
    assert.ok(lines.some((line) => line.includes("只显示这一次")));
  });

  it("does not reprint the password on later boots", () => {
    const lines = formatInitLines({
      origin: "https://blog.example.com/",
      path: "Ab12cXy90Q",
      createdEntrance: false,
      createdAdmin: false,
      email: "owner@example.com",
      password: "should-not-appear",
    });
    assert.deepEqual(lines, [
      "[folio] 后台入口  https://blog.example.com/Ab12cXy90Q",
      "[folio] 管理员    owner@example.com",
    ]);
  });

  it("falls back to /login when the entrance is closed", () => {
    const first = formatInitLines({
      origin: "http://localhost:8011",
      path: "",
      createdEntrance: false,
      createdAdmin: true,
      email: "owner@example.com",
      password: "secret-pass",
    });
    assert.ok(first.some((line) => line.includes("http://localhost:8011/login")));
    assert.ok(first.some((line) => line.includes("已关闭")));
    const later = formatInitLines({
      origin: "http://localhost:8011",
      path: "",
      createdEntrance: false,
      createdAdmin: false,
      email: "owner@example.com",
      password: "",
    });
    assert.ok(later[0].includes("已关闭"));
    assert.equal(later[1], "[folio] 管理员    owner@example.com");
  });
});
