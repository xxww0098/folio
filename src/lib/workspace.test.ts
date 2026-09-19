import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canWriteRole, homeForRole, isStaffRole, workspacePath } from "./workspace.ts";

describe("workspace routes", () => {
  it("sends readers to /me and writers to /console", () => {
    assert.equal(canWriteRole("reader"), false);
    assert.equal(canWriteRole("author"), true);
    assert.equal(isStaffRole("reader"), false);
    assert.equal(isStaffRole("author"), false);
    assert.equal(isStaffRole("editor"), true);
    assert.equal(homeForRole("reader"), "/me");
    assert.equal(homeForRole("author"), "/console");
    assert.equal(homeForRole("editor"), "/console");
    assert.equal(homeForRole("admin"), "/console");
    assert.equal(homeForRole(null), "/me");
    assert.equal(workspacePath("me"), "/me");
    assert.equal(workspacePath("console"), "/console");
  });
});
