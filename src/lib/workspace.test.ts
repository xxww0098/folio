import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canWriteRole, homeForRole, isStaffRole, workspacePath } from "./workspace.ts";

describe("workspace routes", () => {
  it("only admins write and use the console", () => {
    assert.equal(canWriteRole("reader"), false);
    assert.equal(canWriteRole("admin"), true);
    assert.equal(isStaffRole("reader"), false);
    assert.equal(isStaffRole("admin"), true);
    assert.equal(homeForRole("reader"), "/me");
    assert.equal(homeForRole("admin"), "/console");
    assert.equal(homeForRole(null), "/me");
    assert.equal(workspacePath("me"), "/me");
    assert.equal(workspacePath("console"), "/console");
  });
});
